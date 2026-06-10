export type ItemStatus = "available" | "trading" | "completed";

export type Item = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  wantedItem: string;
  category: string;
  status: ItemStatus;
  imageUrl: string;
  likes: number;
  price: number;
  createdAt: string;
};

