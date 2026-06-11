import type { Item } from "./itemTypes";
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

export async function createItem(input: {
  title: string;
  description: string;
  wantedItem: string;
  category: string;
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
        ownerId: "current_user",
        ownerName: "you",
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
      ownerId: "current_user",
      ownerName: "you",
      wantedItem: input.wantedItem,
      category: input.category,
      status: "available",
      imageUrl: input.imageUrl ?? "/images/demo/generated/reading-card-500.png",
      likes: 0,
      price: 0,
      createdAt: new Date().toISOString(),
    };

    fallbackItems = [fallbackItem, ...fallbackItems];
    return fallbackItem;
  }
}
