import type { Favorite, FavoriteScope } from "./favoriteTypes";

const fallbackFavoriteStorageKey = "warashibe.favoriteItems";

type FavoritesResponse = {
  data: Favorite[];
};

type FavoriteResponse = {
  data: Favorite;
};

export async function getFavorites(
  userId: string,
  scope: FavoriteScope = "market"
): Promise<Favorite[]> {
  try {
    const response = await fetch(
      `/api/favorites?userId=${encodeURIComponent(userId)}&scope=${encodeURIComponent(
        scope
      )}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch favorites");
    }

    const json: FavoritesResponse = await response.json();
    return json.data;
  } catch (error) {
    console.warn("お気に入りAPIが使えないためローカルのお気に入りを表示します", error);
    return getLocalFavorites(userId, scope);
  }
}

export async function createFavorite(input: {
  userId: string;
  itemId: string;
  scope?: FavoriteScope;
}): Promise<Favorite> {
  const favoriteInput = {
    ...input,
    scope: input.scope ?? "market",
  };

  try {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(favoriteInput),
    });

    if (!response.ok) {
      throw new Error("Failed to create favorite");
    }

    const json: FavoriteResponse = await response.json();
    return json.data;
  } catch (error) {
    console.warn("お気に入りAPIが使えないためローカルにお気に入りを保存します", error);
    return createLocalFavorite(favoriteInput);
  }
}

export async function deleteFavorite(
  itemId: string,
  userId: string,
  scope: FavoriteScope = "market"
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/favorites/${encodeURIComponent(itemId)}?userId=${encodeURIComponent(
        userId
      )}&scope=${encodeURIComponent(scope)}`,
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
    return deleteLocalFavorite(userId, itemId, scope);
  }
}

function getLocalFavorites(userId: string, scope: FavoriteScope): Favorite[] {
  try {
    const storedValue = window.localStorage.getItem(getStorageKey(userId, scope));
    if (!storedValue) return [];

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue
      .map((value) => toLocalFavorite(value, scope))
      .filter((favorite): favorite is Favorite => favorite !== undefined);
  } catch (error) {
    console.warn("ローカルのお気に入りを読み込めませんでした", error);
    return [];
  }
}

function createLocalFavorite(input: {
  userId: string;
  itemId: string;
  scope: FavoriteScope;
}): Favorite {
  const currentFavorites = getLocalFavorites(input.userId, input.scope);
  const existingFavorite = currentFavorites.find(
    (favorite) => favorite.itemId === input.itemId
  );

  if (existingFavorite) {
    return existingFavorite;
  }

  const favorite: Favorite = {
    id: `${input.userId}_${input.scope}_${input.itemId}`,
    userId: input.userId,
    itemId: input.itemId,
    scope: input.scope,
    createdAt: new Date().toISOString(),
  };

  saveLocalFavorites(input.userId, input.scope, [favorite, ...currentFavorites]);
  return favorite;
}

function deleteLocalFavorite(
  userId: string,
  itemId: string,
  scope: FavoriteScope
): boolean {
  const currentFavorites = getLocalFavorites(userId, scope);
  const nextFavorites = currentFavorites.filter(
    (favorite) => favorite.itemId !== itemId
  );

  saveLocalFavorites(userId, scope, nextFavorites);
  return nextFavorites.length !== currentFavorites.length;
}

function saveLocalFavorites(
  userId: string,
  scope: FavoriteScope,
  favorites: Favorite[]
): void {
  try {
    window.localStorage.setItem(
      getStorageKey(userId, scope),
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.warn("ローカルのお気に入りを保存できませんでした", error);
  }
}

function getStorageKey(userId: string, scope: FavoriteScope): string {
  if (scope === "market") {
    return `${fallbackFavoriteStorageKey}.${userId}`;
  }

  return `${fallbackFavoriteStorageKey}.${scope}.${userId}`;
}

function toLocalFavorite(
  value: unknown,
  fallbackScope: FavoriteScope
): Favorite | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const favorite = value as Record<string, unknown>;
  if (
    typeof favorite.id !== "string" ||
    typeof favorite.userId !== "string" ||
    typeof favorite.itemId !== "string" ||
    typeof favorite.createdAt !== "string"
  ) {
    return undefined;
  }

  return {
    id: favorite.id,
    userId: favorite.userId,
    itemId: favorite.itemId,
    scope: favorite.scope === "ai_warehouse" ? "ai_warehouse" : fallbackScope,
    createdAt: favorite.createdAt,
  };
}
