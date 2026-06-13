export type ItemStatus = "available" | "trading" | "completed";

export type Item = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  condition: string;
  wantedItem: string;
  wantedItems: string[];
  category: string;
  status: ItemStatus;
  imageUrl: string;
  imageUrls: string[];
  likes: number;
  price: number;
  createdAt: string;
};

export type CreateItemInput = {
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  condition?: string;
  wantedItem?: string;
  wantedItems?: string[];
  category: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[];
};
