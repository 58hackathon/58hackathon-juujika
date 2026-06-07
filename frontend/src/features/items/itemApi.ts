import { demoItems } from "./itemData";
import type { Item } from "./itemTypes";

export async function getItems(): Promise<Item[]> {
  return demoItems;
}

export async function getItemById(id: string): Promise<Item | undefined> {
  return demoItems.find((item) => item.id === id);
}

