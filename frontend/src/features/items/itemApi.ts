import type {
  Item,
  ItemGachaInput,
  ItemGachaResult,
  ItemWarehouseUseCase,
} from "./itemTypes";
import { demoItems } from "./itemData";

const itemOverridesStorageKey = "warashibe.itemOverrides";

type ApiItem = Omit<Item, "price" | "listingType"> & {
  price?: number;
  listingType?: Item["listingType"];
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
    listingType: apiItem.listingType ?? "direct",
  };
}

function mergeWithDemoItems(apiItems: Item[]): Item[] {
  const demoItemIds = new Set(demoItems.map((item) => item.id));
  const apiOnlyItems = apiItems.filter((item) => !demoItemIds.has(item.id));

  return applyStoredItemOverrides([...apiOnlyItems, ...demoItems]);
}

export async function getItems(): Promise<Item[]> {
  try {
    const response = await fetch("/api/items");

    if (!response.ok) {
      throw new Error("Failed to fetch items");
    }

    const json: ItemsResponse = await response.json();
    fallbackItems = mergeWithDemoItems(json.data.map(toItem));
    return fallbackItems;
  } catch (error) {
    console.warn("APIにつながらないためデモ商品を表示します", error);
    fallbackItems = applyStoredItemOverrides(fallbackItems);
    return fallbackItems;
  }
}

export async function getItemById(id: string): Promise<Item | undefined> {
  const localItem = getStoredItemOverrides().find((item) => item.id === id);
  if (localItem) {
    return localItem;
  }

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
      listingType: "direct",
      createdAt: new Date().toISOString(),
    };

    fallbackItems = [fallbackItem, ...fallbackItems];
    saveItemOverrides([fallbackItem]);
    return fallbackItem;
  }
}

export async function addItemToWarehouse(input: {
  item: Item;
  warehouseUseCase: ItemWarehouseUseCase;
}): Promise<Item> {
  try {
    const response = await fetch(
      `/api/items/${encodeURIComponent(input.item.id)}/warehouse-use-cases`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouseUseCase: input.warehouseUseCase,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update item warehouse use cases");
    }

    const json: ItemResponse = await response.json();
    return toItem(json.data);
  } catch (error) {
    console.warn("APIにつながらないため画面上で倉庫登録を反映します", error);

    const updatedItem = toWarehouseItem(input.item, input.warehouseUseCase);
    fallbackItems = fallbackItems.some((item) => item.id === updatedItem.id)
      ? fallbackItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      : [updatedItem, ...fallbackItems];
    saveItemOverrides([updatedItem]);

    return updatedItem;
  }
}

export async function completeGachaExchange(input: {
  offeredItem: Item;
  receivedItem: Item;
  currentUserId: string;
  currentUserName: string;
}): Promise<{
  offeredItem: Item;
  receivedItem: Item;
}> {
  const offeredItem: Item = {
    ...input.offeredItem,
    ownerId: input.receivedItem.ownerId,
    ownerName: input.receivedItem.ownerName,
    status: "completed",
    listingType: "direct",
    warehouseUseCase: undefined,
  };
  const receivedItem: Item = {
    ...input.receivedItem,
    ownerId: input.currentUserId,
    ownerName: input.currentUserName,
    status: "available",
    listingType: "direct",
    warehouseUseCase: undefined,
    createdAt: new Date().toISOString(),
  };

  fallbackItems = upsertItems(fallbackItems, [offeredItem, receivedItem]);
  saveItemOverrides([offeredItem, receivedItem]);

  return {
    offeredItem,
    receivedItem,
  };
}

function getFallbackGachaItem(input: ItemGachaInput): ItemGachaResult | undefined {
  const currentItems = applyStoredItemOverrides(fallbackItems);
  const candidates = currentItems.filter((item) => matchesGachaInput(item, input));

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

function toWarehouseItem(
  item: Item,
  warehouseUseCase: ItemWarehouseUseCase
): Item {
  return {
    ...item,
    listingType: "warehouse",
    warehouseUseCase,
  };
}

function applyStoredItemOverrides(items: Item[]): Item[] {
  return upsertItems(items, getStoredItemOverrides());
}

function upsertItems(items: Item[], updatedItems: Item[]): Item[] {
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const item of updatedItems) {
    itemById.set(item.id, item);
  }

  return Array.from(itemById.values());
}

function getStoredItemOverrides(): Item[] {
  try {
    const storedValue = window.localStorage.getItem(itemOverridesStorageKey);
    if (!storedValue) return [];

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(isItem);
  } catch (error) {
    console.warn("ローカルの商品状態を読み込めませんでした", error);
    return [];
  }
}

function saveItemOverrides(updatedItems: Item[]): void {
  try {
    const itemById = new Map(
      getStoredItemOverrides().map((item) => [item.id, item])
    );

    for (const item of updatedItems) {
      itemById.set(item.id, item);
    }

    window.localStorage.setItem(
      itemOverridesStorageKey,
      JSON.stringify(Array.from(itemById.values()))
    );
  } catch (error) {
    console.warn("ローカルの商品状態を保存できませんでした", error);
  }
}

function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.ownerId === "string" &&
    typeof item.ownerName === "string" &&
    typeof item.wantedItem === "string" &&
    typeof item.category === "string" &&
    isItemStatus(item.status) &&
    typeof item.imageUrl === "string" &&
    typeof item.likes === "number" &&
    typeof item.price === "number" &&
    isItemListingType(item.listingType) &&
    typeof item.createdAt === "string" &&
    (item.warehouseUseCase === undefined ||
      item.warehouseUseCase === "ai_route" ||
      item.warehouseUseCase === "gacha")
  );
}

function isItemStatus(value: unknown): value is Item["status"] {
  return value === "available" || value === "trading" || value === "completed";
}

function isItemListingType(value: unknown): value is Item["listingType"] {
  return value === "direct" || value === "warehouse";
}

function matchesGachaInput(item: Item, input: ItemGachaInput): boolean {
  return (
    item.status === "available" &&
    item.id !== input.excludeItemId &&
    item.id !== input.sourceItemId &&
    item.ownerId !== input.userId &&
    item.ownerId !== "current_user" &&
    item.listingType === "warehouse" &&
    item.warehouseUseCase === "gacha" &&
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
