import type {
  AutoTradeRoute,
  AutoTradeRouteStatus,
  AutoTradeRouteStepStatus,
  CreateAutoTradeRouteInput,
  CreateTradeRequestInput,
  UpdateAutoTradeRouteInput,
  TradeSuggestion,
  TradeSuggestionInput,
  TradeSuggestionItem,
  TradeSuggestionResponse,
  TradeRequest,
  TradeRequestStatus,
} from "../models/tradeRequest.js";
import {
  autoTradeRouteStatuses,
  autoTradeRouteStepStatuses,
  tradeRequestStatuses,
} from "../models/tradeRequest.js";
import type { Item } from "../models/item.js";
import { getItems } from "./itemService.js";

type TradeRequestFilters = {
  status?: TradeRequestStatus;
  requesterId?: string;
  receiverId?: string;
  targetItemId?: string;
  offeredItemId?: string;
};

const tradeRequests: TradeRequest[] = [
  {
    id: "request_1",
    targetItemId: "item_1",
    targetItemTitle: "NIKE エアフォース1",
    offeredItemId: "item_2",
    offeredItemTitle: "NEW ERA リュック",
    requesterId: "user_2",
    requesterName: "you_07",
    receiverId: "user_1",
    receiverName: "haru_03",
    message: "ぜひ交換したいです。大切に使います。",
    status: "pending",
    createdAt: "2026-06-08T12:00:00.000Z",
  },
];

let nextTradeRequestNumber = tradeRequests.length + 1;
const autoTradeRoutes: AutoTradeRoute[] = [];

export class TradeRequestServiceError extends Error {
  constructor(message: string, readonly statusCode = 500) {
    super(message);
    this.name = "TradeRequestServiceError";
  }
}

export function getTradeRequests(filters: TradeRequestFilters = {}): TradeRequest[] {
  return tradeRequests
    .filter((tradeRequest) => matchesTradeRequestFilters(tradeRequest, filters))
    .map(toTradeRequestResponse);
}

export function getTradeRequestById(id: string): TradeRequest | undefined {
  const tradeRequest = findTradeRequestById(id);
  return tradeRequest ? toTradeRequestResponse(tradeRequest) : undefined;
}

export function createTradeRequest(input: CreateTradeRequestInput): TradeRequest {
  const tradeRequest: TradeRequest = {
    id: createTradeRequestId(),
    targetItemId: input.targetItemId,
    targetItemTitle: input.targetItemTitle ?? input.targetItemId,
    offeredItemId: input.offeredItemId,
    offeredItemTitle: input.offeredItemTitle ?? input.offeredItemId,
    requesterId: input.requesterId ?? "current_user",
    requesterName: input.requesterName ?? "you",
    receiverId: input.receiverId ?? "item_owner",
    receiverName: input.receiverName ?? "owner",
    message: input.message ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  tradeRequests.push(tradeRequest);
  return toTradeRequestResponse(tradeRequest);
}

export function updateTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): TradeRequest | undefined {
  const tradeRequest = findTradeRequestById(id);
  if (!tradeRequest) return undefined;

  tradeRequest.status = status;
  return toTradeRequestResponse(tradeRequest);
}

export async function createAutoTradeRoute(
  input: CreateAutoTradeRouteInput
): Promise<AutoTradeRoute> {
  const items = await getItems();
  const sourceItem = findItemById(items, input.sourceItemId);
  const goalItem = findItemById(items, input.goalItemId);

  if (!sourceItem) {
    throw new TradeRequestServiceError("sourceItemId was not found", 404);
  }

  if (!goalItem) {
    throw new TradeRequestServiceError("goalItemId was not found", 404);
  }

  if (sourceItem.id === goalItem.id) {
    throw new TradeRequestServiceError(
      "sourceItemId and goalItemId must be different",
      400
    );
  }

  const candidateItems = buildAutoRouteCandidates(items, sourceItem, goalItem, input.userId);
  const suggestionResult = await suggestTradeRequests({
    targetItem: toAutoSuggestionTarget(sourceItem, goalItem),
    candidateItems: candidateItems.map(toSuggestionItemFromItem),
    limit: Math.min(candidateItems.length, 4),
  });

  const selectedSuggestion = suggestionResult.suggestions[0];
  const selectedCandidate =
    candidateItems.find((item) => item.id === selectedSuggestion?.itemId) ??
    candidateItems[0] ??
    goalItem;

  const createdAt = new Date().toISOString();
  const routeItems = buildAutoRouteItems(sourceItem, selectedCandidate, goalItem);
  const steps = routeItems.slice(0, -1).map((item, index) => {
    const nextItem = routeItems[index + 1];

    return {
      id: `auto_step_${Date.now()}_${index}_${item.id}_${nextItem.id}`,
      fromItemId: item.id,
      fromItemTitle: item.title,
      toItemId: nextItem.id,
      toItemTitle: nextItem.title,
      status: "ready" as const,
    };
  });

  const autoRoute: AutoTradeRoute = {
    id: `auto_route_${Date.now()}_${input.userId}`,
    userId: input.userId,
    userName: input.userName ?? "you",
    sourceItemId: sourceItem.id,
    sourceItemTitle: sourceItem.title,
    goalItemId: goalItem.id,
    goalItemTitle: goalItem.title,
    candidateItemId: selectedCandidate.id,
    candidateItemTitle: selectedCandidate.title,
    status: "running",
    matchScore: selectedSuggestion?.score ?? calculateAutoFallbackScore(sourceItem, selectedCandidate, goalItem),
    source: suggestionResult.source,
    summary:
      selectedSuggestion?.reason ??
      `${selectedCandidate.title} is the next candidate toward ${goalItem.title}.`,
    highValueNotice:
      selectedCandidate.price >= 10000
        ? `${selectedCandidate.title} is a high-value candidate. Auto flow created a request but should be reviewed.`
        : undefined,
    steps,
    traceReasons: [
      "Auto route was generated from the selected source and goal items.",
      suggestionResult.source === "gemini"
        ? "Gemini ranked the next exchange candidate."
        : "Fallback scoring ranked the next exchange candidate.",
      input.autoApply === false
        ? "Auto request creation was skipped by request option."
        : "The first exchange request was created automatically.",
    ],
    createdAt,
    updatedAt: createdAt,
  };

  if (input.autoApply !== false && autoRoute.steps[0]) {
    const firstStep = autoRoute.steps[0];
    const targetItem = findItemById(items, firstStep.toItemId) ?? selectedCandidate;
    const tradeRequest = createTradeRequest({
      targetItemId: firstStep.toItemId,
      targetItemTitle: firstStep.toItemTitle,
      offeredItemId: firstStep.fromItemId,
      offeredItemTitle: firstStep.fromItemTitle,
      requesterId: input.userId,
      requesterName: input.userName ?? "you",
      receiverId: targetItem.ownerId,
      receiverName: targetItem.ownerName,
      message: `Auto AI exchange request toward ${goalItem.title}.`,
    });

    firstStep.status = "requested";
    firstStep.tradeRequestId = tradeRequest.id;
    firstStep.requestedAt = tradeRequest.createdAt;
    firstStep.updatedAt = tradeRequest.createdAt;
    autoRoute.updatedAt = tradeRequest.createdAt;
  }

  autoTradeRoutes.unshift(autoRoute);
  return toAutoTradeRouteResponse(autoRoute);
}

export function getAutoTradeRoutes(userId?: string): AutoTradeRoute[] {
  return autoTradeRoutes
    .filter((route) => userId === undefined || route.userId === userId)
    .map(toAutoTradeRouteResponse);
}

export function getAutoTradeRouteById(id: string): AutoTradeRoute | undefined {
  const route = autoTradeRoutes.find((autoTradeRoute) => autoTradeRoute.id === id);
  return route ? toAutoTradeRouteResponse(route) : undefined;
}

export function updateAutoTradeRoute(
  id: string,
  input: UpdateAutoTradeRouteInput
): AutoTradeRoute | undefined {
  const route = autoTradeRoutes.find((autoTradeRoute) => autoTradeRoute.id === id);
  if (!route) return undefined;

  const updatedAt = new Date().toISOString();

  if (input.status) {
    route.status = input.status;
  }

  if (input.stepId && input.stepStatus) {
    const step = route.steps.find((routeStep) => routeStep.id === input.stepId);
    if (step) {
      step.status = input.stepStatus;
      step.updatedAt = updatedAt;

      if (
        step.tradeRequestId &&
        (input.stepStatus === "approved" || input.stepStatus === "completed")
      ) {
        updateTradeRequestStatus(step.tradeRequestId, input.stepStatus);
      }
    }
  }

  route.updatedAt = updatedAt;
  return toAutoTradeRouteResponse(route);
}

export async function suggestTradeRequests(
  input: TradeSuggestionInput
): Promise<TradeSuggestionResponse> {
  const limit = normalizeSuggestionLimit(input.limit, input.candidateItems.length);
  const fallbackSuggestions = buildFallbackTradeSuggestions(input, limit);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || input.candidateItems.length === 0) {
    return { suggestions: fallbackSuggestions, source: "fallback" };
  }

  try {
    const suggestions = await generateGeminiTradeSuggestions(input, limit, apiKey);
    if (suggestions.length > 0) {
      return { suggestions, source: "gemini" };
    }
  } catch {
    return { suggestions: fallbackSuggestions, source: "fallback" };
  }

  return { suggestions: fallbackSuggestions, source: "fallback" };
}

export function isTradeRequestStatus(value: unknown): value is TradeRequestStatus {
  return (
    typeof value === "string" &&
    tradeRequestStatuses.includes(value as TradeRequestStatus)
  );
}

export function isAutoTradeRouteStatus(
  value: unknown
): value is AutoTradeRouteStatus {
  return (
    typeof value === "string" &&
    autoTradeRouteStatuses.includes(value as AutoTradeRouteStatus)
  );
}

export function isAutoTradeRouteStepStatus(
  value: unknown
): value is AutoTradeRouteStepStatus {
  return (
    typeof value === "string" &&
    autoTradeRouteStepStatuses.includes(value as AutoTradeRouteStepStatus)
  );
}

function findItemById(items: Item[], itemId: string): Item | undefined {
  return items.find((item) => item.id === itemId);
}

function buildAutoRouteCandidates(
  items: Item[],
  sourceItem: Item,
  goalItem: Item,
  userId: string
): Item[] {
  const candidates = items.filter((item) =>
    isAutoRouteCandidate(item, sourceItem, goalItem, userId)
  );

  return [...new Map(candidates.map((item) => [item.id, item])).values()];
}

function isAutoRouteCandidate(
  item: Item,
  sourceItem: Item,
  goalItem: Item,
  userId: string
): boolean {
  if (item.id === sourceItem.id) return false;
  if (item.status !== "available") return false;
  if (item.ownerId === userId) return false;

  return (
    item.id === goalItem.id ||
    (item.listingType === "warehouse" &&
      item.warehouseUseCases.includes("ai_route"))
  );
}

function buildAutoRouteItems(
  sourceItem: Item,
  candidateItem: Item,
  goalItem: Item
): Item[] {
  const routeItems = [sourceItem];

  if (candidateItem.id !== sourceItem.id && candidateItem.id !== goalItem.id) {
    routeItems.push(candidateItem);
  }

  routeItems.push(goalItem);
  return routeItems;
}

function toAutoSuggestionTarget(
  sourceItem: Item,
  goalItem: Item
): TradeSuggestionItem {
  return {
    id: sourceItem.id,
    title: sourceItem.title,
    category: sourceItem.category,
    description: sourceItem.description,
    wantedItem: [
      sourceItem.wantedItem,
      goalItem.title,
      goalItem.category,
      goalItem.wantedItem,
    ]
      .filter(Boolean)
      .join(", "),
    ownerName: sourceItem.ownerName,
  };
}

function toSuggestionItemFromItem(item: Item): TradeSuggestionItem {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    wantedItem: item.wantedItem,
    ownerName: item.ownerName,
  };
}

function calculateAutoFallbackScore(
  sourceItem: Item,
  candidateItem: Item,
  goalItem: Item
): number {
  const sameGoalCategoryBonus = candidateItem.category === goalItem.category ? 18 : 0;
  const sourceWantedBonus = sourceItem.wantedItems.includes(candidateItem.category)
    ? 20
    : 0;
  const priceGap =
    sourceItem.price > 0
      ? Math.abs(candidateItem.price - sourceItem.price) / sourceItem.price
      : 1;
  const priceScore = Math.max(0, 30 - Math.round(priceGap * 20));

  return clampScore(45 + sameGoalCategoryBonus + sourceWantedBonus + priceScore);
}

function toAutoTradeRouteResponse(route: AutoTradeRoute): AutoTradeRoute {
  return {
    ...route,
    steps: route.steps.map((step) => ({ ...step })),
    traceReasons: [...route.traceReasons],
  };
}

function findTradeRequestById(id: string): TradeRequest | undefined {
  return tradeRequests.find((tradeRequest) => tradeRequest.id === id);
}

function matchesTradeRequestFilters(
  tradeRequest: TradeRequest,
  filters: TradeRequestFilters
): boolean {
  return (
    matchesOptionalFilter(tradeRequest.status, filters.status) &&
    matchesOptionalFilter(tradeRequest.requesterId, filters.requesterId) &&
    matchesOptionalFilter(tradeRequest.receiverId, filters.receiverId) &&
    matchesOptionalFilter(tradeRequest.targetItemId, filters.targetItemId) &&
    matchesOptionalFilter(tradeRequest.offeredItemId, filters.offeredItemId)
  );
}

function matchesOptionalFilter(
  value: string,
  filterValue: string | undefined
): boolean {
  return filterValue === undefined || value === filterValue;
}

function createTradeRequestId(): string {
  let id = `request_${nextTradeRequestNumber}`;
  while (findTradeRequestById(id)) {
    nextTradeRequestNumber += 1;
    id = `request_${nextTradeRequestNumber}`;
  }

  nextTradeRequestNumber += 1;
  return id;
}

function toTradeRequestResponse(tradeRequest: TradeRequest): TradeRequest {
  return { ...tradeRequest };
}

async function generateGeminiTradeSuggestions(
  input: TradeSuggestionInput,
  limit: number,
  apiKey: string
): Promise<TradeSuggestion[]> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`
  );
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildGeminiSuggestionPrompt(input, limit) }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            suggestions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  itemId: { type: "STRING" },
                  title: { type: "STRING" },
                  score: { type: "NUMBER" },
                  reason: { type: "STRING" },
                },
                required: ["itemId", "title", "score", "reason"],
              },
            },
          },
          required: ["suggestions"],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Gemini request failed");
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const text = extractGeminiText(data);
  if (!text) return [];

  return normalizeGeminiSuggestions(
    parseJsonObject(text),
    input.candidateItems,
    limit
  );
}

function buildGeminiSuggestionPrompt(
  input: TradeSuggestionInput,
  limit: number
): string {
  return [
    "あなたは物々交換アプリの交換候補を選ぶAIです。",
    "targetItemの希望条件に合うcandidateItemsをおすすめ順に選んでください。",
    "scoreは0から100の数値、reasonは日本語で短く書いてください。",
    `最大${limit}件だけ返してください。`,
    JSON.stringify(input),
  ].join("\n");
}

function buildFallbackTradeSuggestions(
  input: TradeSuggestionInput,
  limit: number
): TradeSuggestion[] {
  return input.candidateItems
    .map((candidate) => scoreFallbackCandidate(input.targetItem, candidate))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function scoreFallbackCandidate(
  targetItem: TradeSuggestionItem,
  candidate: TradeSuggestionItem
): TradeSuggestion {
  const targetWanted = normalizeText(targetItem.wantedItem);
  const candidateCategory = normalizeText(candidate.category);
  const candidateTitle = normalizeText(candidate.title);
  const targetCategory = normalizeText(targetItem.category);
  const candidateWanted = normalizeText(candidate.wantedItem);
  const reasonParts: string[] = [];
  let score = 50;

  if (candidateCategory && targetWanted.includes(candidateCategory)) {
    score += 30;
    reasonParts.push(`希望条件に「${candidate.category}」が含まれています`);
  }

  if (candidateTitle && targetWanted.includes(candidateTitle)) {
    score += 25;
    reasonParts.push(`希望条件に近い商品名です`);
  }

  if (targetCategory && candidateWanted.includes(targetCategory)) {
    score += 15;
    reasonParts.push(`相手の希望にも合いやすいです`);
  }

  if (reasonParts.length === 0) {
    reasonParts.push("交換候補として比較しやすい商品です");
  }

  return {
    itemId: candidate.id,
    title: candidate.title,
    score: clampScore(score),
    reason: `${reasonParts.join("。")}。`,
  };
}

function normalizeGeminiSuggestions(
  value: unknown,
  candidateItems: TradeSuggestionItem[],
  limit: number
): TradeSuggestion[] {
  const suggestionsValue = isRecord(value) ? value.suggestions : undefined;
  if (!Array.isArray(suggestionsValue)) return [];

  const candidateById = new Map(
    candidateItems.map((candidate) => [candidate.id, candidate])
  );

  return suggestionsValue
    .map((suggestion) => toTradeSuggestion(suggestion, candidateById))
    .filter((suggestion): suggestion is TradeSuggestion => suggestion !== undefined)
    .slice(0, limit);
}

function toTradeSuggestion(
  value: unknown,
  candidateById: Map<string, TradeSuggestionItem>
): TradeSuggestion | undefined {
  if (!isRecord(value)) return undefined;

  const itemId = getStringField(value, "itemId");
  if (!itemId) return undefined;

  const candidate = candidateById.get(itemId);
  if (!candidate) return undefined;

  return {
    itemId,
    title: getStringField(value, "title") ?? candidate.title,
    score: clampScore(getNumberField(value, "score") ?? 50),
    reason:
      getStringField(value, "reason") ??
      "交換候補としておすすめできる商品です。",
  };
}

function extractGeminiText(data: GeminiGenerateContentResponse): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseJsonObject(text: string): unknown {
  const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  return JSON.parse(cleanText);
}

function normalizeSuggestionLimit(
  value: number | undefined,
  candidateCount: number
): number {
  if (candidateCount <= 0) return 0;
  if (value === undefined || !Number.isFinite(value)) {
    return Math.min(candidateCount, 3);
  }

  return Math.min(Math.max(Math.floor(value), 1), candidateCount, 5);
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function clampScore(value: number): number {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  value: Record<string, unknown>,
  field: string
): string | undefined {
  const fieldValue = value[field];
  return typeof fieldValue === "string" && fieldValue.trim() !== ""
    ? fieldValue.trim()
    : undefined;
}

function getNumberField(
  value: Record<string, unknown>,
  field: string
): number | undefined {
  const fieldValue = value[field];
  return typeof fieldValue === "number" && Number.isFinite(fieldValue)
    ? fieldValue
    : undefined;
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};
