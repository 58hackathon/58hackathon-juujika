export type Favorite = {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
};

export type CreateFavoriteInput = {
  userId: string;
  itemId: string;
};

export type DeleteFavoriteInput = {
  userId: string;
  itemId: string;
};
