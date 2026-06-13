import type { Favorite } from "./favoriteTypes";

type FavoritesResponse = {
  data: Favorite[];
};

type FavoriteResponse = {
  data: Favorite;
};

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const response = await fetch(
    `/api/favorites?userId=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch favorites");
  }

  const json: FavoritesResponse = await response.json();
  return json.data;
}

export async function createFavorite(input: {
  userId: string;
  itemId: string;
}): Promise<Favorite> {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Failed to create favorite");
  }

  const json: FavoriteResponse = await response.json();
  return json.data;
}

export async function deleteFavorite(
  itemId: string,
  userId: string
): Promise<boolean> {
  const response = await fetch(
    `/api/favorites/${encodeURIComponent(itemId)}?userId=${encodeURIComponent(
      userId
    )}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete favorite");
  }

  const json: { deleted: boolean } = await response.json();
  return json.deleted;
}
