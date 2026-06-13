import type { Item } from "../items/itemTypes";
import type {
  AiTradeRoute,
  AiTradeRouteRequest,
} from "./aiProposalTypes";

type TradeSuggestion = {
  itemId: string;
  title: string;
  score: number;
  reason: string;
};

type TradeSuggestionsResponse = {
  suggestions: TradeSuggestion[];
  source: "gemini" | "fallback";
};

export async function getAiTradeRoutes(
  input: AiTradeRouteRequest
): Promise<AiTradeRoute[]> {
  try {
    const sourceItem = findItem(input.items, input.sourceItemId);
    if (!sourceItem) return [];

    const candidateItems = getCandidateItems(input);
    const response = await fetch("/api/trade-requests/suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceItemId: input.sourceItemId,
        candidateItemIds: candidateItems.map((item) => item.id),
        limit: input.limit ?? 3,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch AI suggestions");
    }

    const json: TradeSuggestionsResponse = await response.json();
    return createRoutesFromSuggestions(input, json);
  } catch (error) {
    console.warn("AI提案APIにつながらないためモック提案を表示します", error);
    return createMockAiTradeRoutes(input);
  }
}

function getCandidateItems(input: AiTradeRouteRequest): Item[] {
  return input.items
    .filter((item) => item.id !== input.sourceItemId)
    .filter((item) => item.status === "available")
    .sort((left, right) => {
      if (left.id === input.goalItemId) return -1;
      if (right.id === input.goalItemId) return 1;
      return 0;
    });
}

function createRoutesFromSuggestions(
  input: AiTradeRouteRequest,
  response: TradeSuggestionsResponse
): AiTradeRoute[] {
  const sourceItem = findItem(input.items, input.sourceItemId);
  if (!sourceItem) return [];

  const suggestions = response.suggestions
    .map((suggestion, index) => {
      const suggestedItem = findItem(input.items, suggestion.itemId);
      if (!suggestedItem) return undefined;

      return createSuggestionRoute({
        id: `suggestion_${sourceItem.id}_${suggestion.itemId}_${index}`,
        sourceItem,
        suggestedItem,
        suggestion,
        source: response.source,
      });
    })
    .filter((route): route is AiTradeRoute => Boolean(route));

  return suggestions.length > 0 ? suggestions : createMockAiTradeRoutes(input);
}

function createSuggestionRoute({
  id,
  sourceItem,
  suggestedItem,
  suggestion,
  source,
}: {
  id: string;
  sourceItem: Item;
  suggestedItem: Item;
  suggestion: TradeSuggestion;
  source: TradeSuggestionsResponse["source"];
}): AiTradeRoute {
  return {
    id,
    title: `${suggestion.title}への交換候補`,
    matchScore: normalizeScore(suggestion.score),
    summary: suggestion.reason,
    steps: [
      {
        itemId: sourceItem.id,
        title: sourceItem.title,
        imageUrl: sourceItem.imageUrl,
        matchReason: "あなたの出品からスタート",
      },
      {
        itemId: suggestedItem.id,
        title: suggestedItem.title,
        imageUrl: suggestedItem.imageUrl,
        matchReason: suggestion.reason,
      },
    ],
    traceReasons: [
      source === "gemini"
        ? "バックエンドAI APIがGeminiで候補を評価"
        : "バックエンドAI APIのfallback候補を使用",
      "出品商品と候補商品のカテゴリ・希望条件・説明をもとに提案",
      suggestion.reason,
    ],
  };
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function createMockAiTradeRoutes(input: AiTradeRouteRequest): AiTradeRoute[] {
  const sourceItem = findItem(input.items, input.sourceItemId);
  const goalItem = findItem(input.items, input.goalItemId);

  if (!sourceItem || !goalItem) return [];

  const candidates = input.items
    .filter((item) => item.id !== sourceItem.id && item.id !== goalItem.id)
    .filter((item) => item.status === "available");

  const balancedBridgeItems = candidates.slice(0, 2);
  const shortBridgeItems = candidates.slice(0, 1);
  const challengeBridgeItems = candidates.slice(1, 4);

  return [
    createRoute({
      id: `route_recommended_${sourceItem.id}_${goalItem.id}`,
      sourceItem,
      goalItem,
      bridgeItems: balancedBridgeItems,
      scoreOffset: 8,
      summary: "一番バランスが良い",
    }),
    createRoute({
      id: `route_short_${sourceItem.id}_${goalItem.id}`,
      sourceItem,
      goalItem,
      bridgeItems: shortBridgeItems,
      scoreOffset: -5,
      summary: "すぐ成立しやすい",
    }),
    createRoute({
      id: `route_challenge_${sourceItem.id}_${goalItem.id}`,
      sourceItem,
      goalItem,
      bridgeItems: challengeBridgeItems,
      scoreOffset: -24,
      summary: "価値は高いが難しい",
    }),
  ];
}

function createRoute({
  id,
  sourceItem,
  goalItem,
  bridgeItems,
  scoreOffset,
  summary,
}: {
  id: string;
  sourceItem: Item;
  goalItem: Item;
  bridgeItems: Item[];
  scoreOffset: number;
  summary: string;
}): AiTradeRoute {
  const routeItems = [sourceItem, ...bridgeItems, goalItem];
  const score = Math.min(
    92,
    Math.max(34, calculateMockScore(sourceItem, goalItem, bridgeItems) + scoreOffset)
  );

  return {
    id,
    title: `${goalItem.title}到達ルート`,
    matchScore: score,
    summary,
    steps: routeItems.map((item, index) => ({
      itemId: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      matchReason: getStepReason(index, item, goalItem),
    })),
    traceReasons: [
      "出品商品の希望条件に近いカテゴリを優先",
      "ゴール商品の希望条件に近づく中継商品を選択",
      "価格ではなく、希望一致・カテゴリ相性・人気度を参考にスコア化",
    ],
  };
}

function findItem(items: Item[], itemId: string): Item | undefined {
  return items.find((item) => item.id === itemId);
}

function calculateMockScore(
  sourceItem: Item,
  goalItem: Item,
  bridgeItems: Item[]
): number {
  const sameCategoryBonus = sourceItem.category === goalItem.category ? 18 : 0;
  const wantedMatchBonus = goalItem.wantedItem.includes(sourceItem.category)
    ? 16
    : 8;
  const routeLengthPenalty = bridgeItems.length * 4;
  const popularityBonus = Math.min(Math.floor(goalItem.likes / 6), 14);

  return Math.min(
    92,
    Math.max(42, 64 + sameCategoryBonus + wantedMatchBonus + popularityBonus - routeLengthPenalty)
  );
}

function getStepReason(index: number, item: Item, goalItem: Item): string {
  if (index === 0) return "あなたの出品からスタート";
  if (item.id === goalItem.id) return "到達したい商品";
  if (goalItem.wantedItem.includes(item.category)) return "ゴール商品の希望に近い";

  return "次の交換につなげやすい候補";
}
