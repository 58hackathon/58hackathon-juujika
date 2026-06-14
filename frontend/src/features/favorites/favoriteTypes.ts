export type FavoriteScope = "market" | "ai_warehouse";

export type Favorite = {
  id: string;
  userId: string;
  itemId: string;
  scope: FavoriteScope;
  createdAt: string;
};
