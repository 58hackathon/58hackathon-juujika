import type { Favorite } from "./favoriteTypes";

const fallbackFavoriteStorageKey = "warashibe.favoriteItems";

type FavoritesResponse = {
  data: Favorite[];
};

type FavoriteResponse = {
  data: Favorite;
};

export async function getFavorites(userId: string): Promise<Favorite[]> {
  try {
    const response = await fetch(
      `/api/favorites?userId=${encodeURIComponent(userId)}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch favorites");
    }

    const json: FavoritesResponse = await response.json();
    return json.data;
  } catch (error) {
    console.warn("お気に入りAPIが使えないためローカルのお気に入りを表示します", error);
    return getLocalFavorites(userId);
  }
}

export async function createFavorite(input: {
  userId: string;
  itemId: string;
}): Promise<Favorite> {
  try {
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
  } catch (error) {
    console.warn("お気に入りAPIが使えないためローカルにお気に入りを保存します", error);
    return createLocalFavorite(input);
  }
}

export async function deleteFavorite(
  itemId: string,
  userId: string
): Promise<boolean> {
  try {
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

    const json: { deleted?: boolean; data?: { deleted?: boolean } } =
      await response.json();
    return Boolean(json.deleted ?? json.data?.deleted);
  } catch (error) {
    console.warn("お気に入りAPIが使えないためローカルのお気に入りを削除します", error);
    return deleteLocalFavorite(userId, itemId);
  }
}

function getLocalFavorites(userId: string): Favorite[] {
  try {
    const storedValue = window.localStorage.getItem(getStorageKey(userId));
    if (!storedValue) return [];

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(isFavorite);
  } catch (error) {
    console.warn("ローカルのお気に入りを読み込めませんでした", error);
    return [];
  }
}

function createLocalFavorite(input: {
  userId: string;
  itemId: string;
}): Favorite {
  const currentFavorites = getLocalFavorites(input.userId);
  const existingFavorite = currentFavorites.find(
    (favorite) => favorite.itemId === input.itemId
  );

  if (existingFavorite) {
    return existingFavorite;
  }

  const favorite: Favorite = {
    id: `${input.userId}_${input.itemId}`,
    userId: input.userId,
    itemId: input.itemId,
    createdAt: new Date().toISOString(),
  };

  saveLocalFavorites(input.userId, [favorite, ...currentFavorites]);
  return favorite;
}

function deleteLocalFavorite(userId: string, itemId: string): boolean {
  const currentFavorites = getLocalFavorites(userId);
  const nextFavorites = currentFavorites.filter(
    (favorite) => favorite.itemId !== itemId
  );

  saveLocalFavorites(userId, nextFavorites);
  return nextFavorites.length !== currentFavorites.length;
}

function saveLocalFavorites(userId: string, favorites: Favorite[]): void {
  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.warn("ローカルのお気に入りを保存できませんでした", error);
  }
}

function getStorageKey(userId: string): string {
  return `${fallbackFavoriteStorageKey}.${userId}`;
}

function isFavorite(value: unknown): value is Favorite {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const favorite = value as Record<string, unknown>;
  return (
    typeof favorite.id === "string" &&
    typeof favorite.userId === "string" &&
    typeof favorite.itemId === "string" &&
    typeof favorite.createdAt === "string"
  );
}
