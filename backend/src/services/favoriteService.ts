import type {
  CreateFavoriteInput,
  DeleteFavoriteInput,
  Favorite,
} from "../models/favorite.js";

const favoritesCollectionName = "favorites";
const firestoreDatabaseId = "(default)";

type FirebaseConfig = {
  apiKey: string;
  projectId: string;
};

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type FirestoreRunQueryResponse = Array<{
  document?: FirestoreDocument;
}>;

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
};

export class FavoriteServiceError extends Error {
  constructor(message: string, readonly statusCode = 500) {
    super(message);
    this.name = "FavoriteServiceError";
  }
}

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const rows = await requestFirestore<FirestoreRunQueryResponse>(
    ":runQuery",
    {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: favoritesCollectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: userId },
            },
          },
        },
      }),
    }
  );

  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => document !== undefined)
    .map(toFavorite)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createFavorite(
  input: CreateFavoriteInput
): Promise<Favorite> {
  const favorite: Favorite = {
    id: createFavoriteDocumentId(input.userId, input.itemId),
    userId: input.userId,
    itemId: input.itemId,
    createdAt: new Date().toISOString(),
  };

  const document = await requestFirestore<FirestoreDocument>(
    `/${favoritesCollectionName}/${favorite.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toFirestoreDocument(favorite)),
    }
  );

  return toFavorite(document);
}

export async function deleteFavorite(
  input: DeleteFavoriteInput
): Promise<boolean> {
  const id = createFavoriteDocumentId(input.userId, input.itemId);

  try {
    await requestFirestore<Record<string, never>>(`/${favoritesCollectionName}/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    if (
      error instanceof FavoriteServiceError &&
      error.statusCode === 404
    ) {
      return false;
    }

    throw error;
  }
}

async function requestFirestore<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const config = getFirebaseConfig();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${firestoreDatabaseId}/documents${path}`
  );
  endpoint.searchParams.set("key", config.apiKey);

  const response = await fetch(endpoint, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new FavoriteServiceError(
      message || "Firestore favorites request failed",
      response.status >= 400 && response.status < 500 ? response.status : 502
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

function getFirebaseConfig(): FirebaseConfig {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !projectId) {
    throw new FavoriteServiceError(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY in backend/.env.",
      503
    );
  }

  return { apiKey, projectId };
}

function toFirestoreDocument(favorite: Favorite): FirestoreDocument {
  return {
    fields: {
      userId: { stringValue: favorite.userId },
      itemId: { stringValue: favorite.itemId },
      createdAt: { timestampValue: favorite.createdAt },
    },
  };
}

function toFavorite(document: FirestoreDocument): Favorite {
  const fields = document.fields ?? {};

  return {
    id: getDocumentId(document.name ?? ""),
    userId: getStringValue(fields.userId),
    itemId: getStringValue(fields.itemId),
    createdAt: getTimestampValue(fields.createdAt),
  };
}

function createFavoriteDocumentId(userId: string, itemId: string): string {
  return `${toSafeDocumentId(userId)}_${toSafeDocumentId(itemId)}`;
}

function toSafeDocumentId(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function getDocumentId(name: string): string {
  return name.split("/").at(-1) ?? "";
}

function getStringValue(value: FirestoreValue | undefined): string {
  return value?.stringValue ?? "";
}

function getTimestampValue(value: FirestoreValue | undefined): string {
  return value?.timestampValue ?? new Date().toISOString();
}
