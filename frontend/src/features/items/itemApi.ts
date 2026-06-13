import type { Item, ItemGachaInput, ItemGachaResult } from "./itemTypes";
import { demoItems } from "./itemData";

type ApiItem = Omit<Item, "price"> & {
  price?: number;
};

type ItemResponse = {
  data: ApiItem;
};

type ItemsResponse = {
  data: ApiItem[];
};

type GachaResponse = {
  data: {
    item: ApiItem;
    reason: string;
    poolSize: number;
  };
};

let fallbackItems: Item[] = [...demoItems];

function toItem(apiItem: ApiItem): Item {
  return {
    ...apiItem,
    price: apiItem.price ?? 0,
  };
}

function mergeWithDemoItems(apiItems: Item[]): Item[] {
  const demoItemIds = new Set(demoItems.map((item) => item.id));
  const apiOnlyItems = apiItems.filter((item) => !demoItemIds.has(item.id));

  return [...apiOnlyItems, ...demoItems];
}

export async function getItems(): Promise<Item[]> {
  try {
    const response = await fetch("/api/items");

    if (!response.ok) {
      throw new Error("Failed to fetch items");
    }

    const json: ItemsResponse = await response.json();
    return mergeWithDemoItems(json.data.map(toItem));
  } catch (error) {
    console.warn("APIにつながらないためデモ商品を表示します", error);
    return fallbackItems;
  }
}

export async function getItemById(id: string): Promise<Item | undefined> {
  const demoItem = demoItems.find((item) => item.id === id);
  if (demoItem) {
    return demoItem;
  }

  try {
    const response = await fetch(`/api/items/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch item");
    }

    const json: ItemResponse = await response.json();
    return toItem(json.data);
  } catch (error) {
    console.warn("APIにつながらないため一時商品から探します", error);
    return fallbackItems.find((item) => item.id === id);
  }
}

export async function getGachaItem(
  input: ItemGachaInput = {}
): Promise<ItemGachaResult | undefined> {
  try {
    const endpoint = new URL("/api/items/gacha", window.location.origin);

    Object.entries(input).forEach(([key, value]) => {
      if (value === undefined || value === "") return;
      endpoint.searchParams.set(key, String(value));
    });

    const response = await fetch(`${endpoint.pathname}${endpoint.search}`);

    if (!response.ok) {
      throw new Error("Failed to fetch gacha item");
    }

    const json: GachaResponse = await response.json();
    return {
      ...json.data,
      item: toItem(json.data.item),
    };
  } catch (error) {
    console.warn("APIからガチャ候補を取得できないためデモ商品から選びます", error);
    return getFallbackGachaItem(input);
  }
}

export async function createItem(input: {
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  wantedItem: string;
  category: string;
  price: number;
  imageUrl?: string;
}): Promise<Item> {
  try {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create item");
    }

    const json: ItemResponse = await response.json();
    return toItem(json.data);
  } catch (error) {
    console.warn("APIにつながらないため仮の商品を作成します", error);

    const fallbackItem: Item = {
      id: `demo_${Date.now()}`,
      title: input.title,
      description: input.description,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      wantedItem: input.wantedItem,
      category: input.category,
      status: "available",
      imageUrl: input.imageUrl ?? "/images/demo/generated/reading-card-500.png",
      likes: 0,
      price: input.price,
      createdAt: new Date().toISOString(),
    };

    fallbackItems = [fallbackItem, ...fallbackItems];
    return fallbackItem;
  }
}

function getFallbackGachaItem(input: ItemGachaInput): ItemGachaResult | undefined {
  const candidates = fallbackItems.filter((item) => matchesGachaInput(item, input));

  if (candidates.length === 0) {
    return undefined;
  }

  const item = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    item,
    reason: buildFallbackGachaReason(item, input),
    poolSize: candidates.length,
  };
}

function matchesGachaInput(item: Item, input: ItemGachaInput): boolean {
  return (
    item.status === "available" &&
    item.id !== input.excludeItemId &&
    item.id !== input.sourceItemId &&
    item.ownerId !== input.userId &&
    item.ownerId !== "current_user" &&
    item.listingType === "warehouse" &&
    item.warehouseUseCases?.includes("gacha") === true &&
    matchesOptionalText(item.category, input.category) &&
    matchesOptionalMin(item.price, input.minPrice) &&
    matchesOptionalMax(item.price, input.maxPrice)
  );
}

function matchesOptionalText(value: string, expected: string | undefined): boolean {
  return expected === undefined || value === expected;
}

function matchesOptionalMin(value: number, min: number | undefined): boolean {
  return min === undefined || value >= min;
}

function matchesOptionalMax(value: number, max: number | undefined): boolean {
  return max === undefined || value <= max;
}

function buildFallbackGachaReason(item: Item, input: ItemGachaInput): string {
  const reasons = ["ガチャ対象の倉庫商品からランダムに選ばれました"];

  if (input.category && item.category === input.category) {
    reasons.push(`カテゴリ一致: ${item.category}`);
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    reasons.push(`価格: ¥${item.price.toLocaleString()}`);
  }

  return reasons.join(" / ");
}
