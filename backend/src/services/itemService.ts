import type { CreateItemInput, Item } from "../models/item.js";

const items: Item[] = [
  {
    id: "item_1",
    title: "NIKE Air Force 1",
    description: "Lightly used sneakers ready for a new owner.",
    ownerId: "user_1",
    ownerName: "haru_03",
    wantedItem: "Sneakers, bags, accessories",
    category: "fashion",
    status: "available",
    imageUrl: "/images/demo/air-force-1.png",
    likes: 72,
    price: 25000,
    createdAt: "2026-06-08T10:00:00.000Z",
  },
  {
    id: "item_2",
    title: "NEW ERA Cap",
    description: "Black cap in good condition.",
    ownerId: "user_2",
    ownerName: "you_07",
    wantedItem: "Shoes or small gadgets",
    category: "fashion",
    status: "available",
    imageUrl: "/images/demo/new-era-cap.png",
    likes: 31,
    price: 1400,
    createdAt: "2026-06-08T11:00:00.000Z",
  },
];

export function getItems(): Item[] {
  return [...items];
}

export function getItemById(id: string): Item | undefined {
  return items.find((item) => item.id === id);
}

export function createItem(input: CreateItemInput): Item {
  const item: Item = {
    id: `item_${Date.now()}`,
    title: input.title,
    description: input.description,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    wantedItem: input.wantedItem,
    category: input.category,
    status: "available",
    imageUrl: input.imageUrl ?? "",
    likes: 0,
    price: input.price,
    createdAt: new Date().toISOString(),
  };

  items.push(item);
  return item;
}
