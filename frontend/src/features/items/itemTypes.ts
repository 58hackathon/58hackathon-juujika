export type ItemStatus = "available" | "trading" | "completed";
export type ItemListingType = "direct" | "warehouse";
export type ItemWarehouseUseCase = "ai_route" | "gacha";

export type Item = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  condition?: string;
  wantedItem: string;
  wantedItems?: string[];
  category: string;
  status: ItemStatus;
  imageUrl: string;
  imageUrls?: string[];
  likes: number;
  price: number;
  listingType: ItemListingType;
  warehouseUseCase?: ItemWarehouseUseCase;
  createdAt: string;
};

export type ItemGachaInput = {
  userId?: string;
  excludeItemId?: string;
  sourceItemId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type ItemGachaResult = {
  item: Item;
  reason: string;
  poolSize: number;
};
