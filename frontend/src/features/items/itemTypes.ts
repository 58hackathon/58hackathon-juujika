export type ItemStatus = "available" | "trading" | "completed";
export type ItemListingType = "direct" | "warehouse";
export type ItemWarehouseUseCase = "ai_route" | "gacha";

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
  listingType?: ItemListingType;
  warehouseUseCases?: ItemWarehouseUseCase[];
  createdAt: string;
};
