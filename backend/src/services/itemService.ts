import type {
  AddItemToWarehouseInput,
  CreateItemInput,
  Item,
  ItemGachaInput,
  ItemGachaResult,
} from "../models/item.js";

const itemsCollectionName = "items";
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

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
};

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
  integerValue?: string | number;
  arrayValue?: {
    values?: FirestoreValue[];
  };
};

export class ItemServiceError extends Error {
  constructor(message: string, readonly statusCode = 500) {
    super(message);
    this.name = "ItemServiceError";
  }
}

const fallbackItems: Item[] = [
  {
    id: "item_1",
    title: "NIKE Air Force 1",
    description: "Lightly used sneakers ready for a new owner.",
    ownerId: "user_1",
    ownerName: "haru_03",
    condition: "good",
    wantedItem: "Sneakers, bags, accessories",
    wantedItems: ["Sneakers", "bags", "accessories"],
    category: "fashion",
    status: "available",
    imageUrl: "/images/demo/air-force-1.png",
    imageUrls: ["/images/demo/air-force-1.png"],
    likes: 72,
    price: 25000,
    listingType: "direct",
    warehouseUseCases: [],
    createdAt: "2026-06-08T10:00:00.000Z",
  },
  {
    id: "item_2",
    title: "NEW ERA Cap",
    description: "Black cap in good condition.",
    ownerId: "user_2",
    ownerName: "you_07",
    condition: "good",
    wantedItem: "Shoes or small gadgets",
    wantedItems: ["Shoes", "small gadgets"],
    category: "fashion",
    status: "available",
    imageUrl: "/images/demo/new-era-cap.png",
    imageUrls: ["/images/demo/new-era-cap.png"],
    likes: 31,
    price: 1400,
    listingType: "direct",
    warehouseUseCases: [],
    createdAt: "2026-06-08T11:00:00.000Z",
  },
];

export async function getItems(): Promise<Item[]> {
  if (!hasFirebaseConfig()) {
    return [...fallbackItems];
  }

  const response = await requestFirestore<FirestoreListResponse>(
    `/${itemsCollectionName}`
  );

  return (response.documents ?? [])
    .map(toItem)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getItemById(id: string): Promise<Item | undefined> {
  if (!hasFirebaseConfig()) {
    return fallbackItems.find((item) => item.id === id);
  }

  try {
    const document = await requestFirestore<FirestoreDocument>(
      `/${itemsCollectionName}/${id}`
    );
    return toItem(document);
  } catch (error) {
    if (error instanceof ItemServiceError && error.statusCode === 404) {
      return fallbackItems.find((item) => item.id === id);
    }

    throw error;
  }
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const item = toNewItem(input);

  if (!hasFirebaseConfig()) {
    fallbackItems.unshift(item);
    return item;
  }

  const document = await requestFirestore<FirestoreDocument>(
    `/${itemsCollectionName}/${item.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toFirestoreDocument(item)),
    }
  );

  return toItem(document);
}

export async function addItemToWarehouse(
  id: string,
  input: AddItemToWarehouseInput
): Promise<Item> {
  const item = await getItemById(id);

  if (!item) {
    throw new ItemServiceError("Item not found", 404);
  }

  const nextItem: Item = {
    ...item,
    listingType: "warehouse",
    warehouseUseCases: item.warehouseUseCases.includes(input.warehouseUseCase)
      ? item.warehouseUseCases
      : [...item.warehouseUseCases, input.warehouseUseCase],
  };

  if (!hasFirebaseConfig()) {
    const itemIndex = fallbackItems.findIndex((fallbackItem) => fallbackItem.id === id);
    if (itemIndex >= 0) {
      fallbackItems[itemIndex] = nextItem;
    }

    return nextItem;
  }

  const document = await requestFirestore<FirestoreDocument>(
    `/${itemsCollectionName}/${nextItem.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toFirestoreDocument(nextItem)),
    }
  );

  return toItem(document);
}

export async function getGachaItem(
  input: ItemGachaInput = {}
): Promise<ItemGachaResult | undefined> {
  const candidates = (await getItems()).filter((item) =>
    matchesGachaInput(item, input)
  );

  if (candidates.length === 0) {
    return undefined;
  }

  const item = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    item,
    reason: buildGachaReason(item, input),
    poolSize: candidates.length,
  };
}

function toNewItem(input: CreateItemInput): Item {
  const wantedItems = normalizeStringArray(input.wantedItems, input.wantedItem);
  const imageUrls = normalizeStringArray(input.imageUrls, input.imageUrl);

  return {
    id: `item_${Date.now()}`,
    title: input.title,
    description: input.description,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    condition: input.condition?.trim() ?? "",
    wantedItem: input.wantedItem?.trim() || wantedItems.join(", "),
    wantedItems,
    category: input.category,
    status: "available",
    imageUrl: input.imageUrl?.trim() || imageUrls[0] || "",
    imageUrls,
    likes: 0,
    price: input.price,
    listingType: input.listingType ?? "direct",
    warehouseUseCases: input.warehouseUseCases ?? [],
    createdAt: new Date().toISOString(),
  };
}

function matchesGachaInput(item: Item, input: ItemGachaInput): boolean {
  return (
    item.status === "available" &&
    item.id !== input.excludeItemId &&
    item.id !== input.sourceItemId &&
    item.ownerId !== input.userId &&
    item.listingType === "warehouse" &&
    item.warehouseUseCases.includes("gacha") &&
    matchesOptionalText(item.category, input.category) &&
    matchesOptionalMin(item.price, input.minPrice) &&
    matchesOptionalMax(item.price, input.maxPrice)
  );
}

function matchesOptionalText(value: string, expected: string | undefined): boolean {
  return expected === undefined || value === expected;
}

function matchesOptionalMin(value: number, min: number | undefined): boolean {
  return min === undefined || value >= min;
}

function matchesOptionalMax(value: number, max: number | undefined): boolean {
  return max === undefined || value <= max;
}

function buildGachaReason(item: Item, input: ItemGachaInput): string {
  const reasons = ["Randomly selected from available items"];

  if (input.category && item.category === input.category) {
    reasons.push(`category matched: ${item.category}`);
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    reasons.push(`price: ${item.price}`);
  }

  return reasons.join("; ");
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
    throw new ItemServiceError(
      message || "Firestore items request failed",
      response.status >= 400 && response.status < 500 ? response.status : 502
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

function hasFirebaseConfig(): boolean {
  return Boolean(
    process.env.FIREBASE_WEB_API_KEY?.trim() &&
      process.env.FIREBASE_PROJECT_ID?.trim()
  );
}

function getFirebaseConfig(): FirebaseConfig {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !projectId) {
    throw new ItemServiceError(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY in backend/.env.",
      503
    );
  }

  return { apiKey, projectId };
}

function toFirestoreDocument(item: Item): FirestoreDocument {
  return {
    fields: {
      id: { stringValue: item.id },
      title: { stringValue: item.title },
      description: { stringValue: item.description },
      ownerId: { stringValue: item.ownerId },
      ownerName: { stringValue: item.ownerName },
      condition: { stringValue: item.condition },
      wantedItem: { stringValue: item.wantedItem },
      wantedItems: toFirestoreStringArray(item.wantedItems),
      category: { stringValue: item.category },
      status: { stringValue: item.status },
      imageUrl: { stringValue: item.imageUrl },
      imageUrls: toFirestoreStringArray(item.imageUrls),
      likes: { integerValue: item.likes },
      price: { integerValue: item.price },
      listingType: { stringValue: item.listingType },
      warehouseUseCases: toFirestoreStringArray(item.warehouseUseCases),
      createdAt: { timestampValue: item.createdAt },
    },
  };
}

function toItem(document: FirestoreDocument): Item {
  const fields = document.fields ?? {};
  const wantedItems = getStringArrayValue(fields.wantedItems);
  const imageUrls = getStringArrayValue(fields.imageUrls);
  const wantedItem = getStringValue(fields.wantedItem) || wantedItems.join(", ");
  const imageUrl = getStringValue(fields.imageUrl) || imageUrls[0] || "";

  return {
    id: getStringValue(fields.id) || getDocumentId(document.name ?? ""),
    title: getStringValue(fields.title),
    description: getStringValue(fields.description),
    ownerId: getStringValue(fields.ownerId),
    ownerName: getStringValue(fields.ownerName),
    condition: getStringValue(fields.condition),
    wantedItem,
    wantedItems: wantedItems.length > 0 ? wantedItems : normalizeStringArray(undefined, wantedItem),
    category: getStringValue(fields.category),
    status: getItemStatus(fields.status),
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : normalizeStringArray(undefined, imageUrl),
    likes: getIntegerValue(fields.likes),
    price: getIntegerValue(fields.price),
    listingType: getItemListingType(fields.listingType),
    warehouseUseCases: getWarehouseUseCases(fields.warehouseUseCases),
    createdAt: getTimestampValue(fields.createdAt),
  };
}

function toFirestoreStringArray(values: string[]): FirestoreValue {
  return {
    arrayValue: {
      values: values.map((value) => ({ stringValue: value })),
    },
  };
}

function normalizeStringArray(
  values: string[] | undefined,
  fallbackValue?: string
): string[] {
  const normalizedValues = Array.isArray(values)
    ? values
        .map((value) => value.trim())
        .filter((value) => value !== "")
    : [];

  if (normalizedValues.length > 0) {
    return normalizedValues;
  }

  return fallbackValue
    ? fallbackValue
        .split(/[,\n]/u)
        .map((value) => value.trim())
        .filter((value) => value !== "")
    : [];
}

function getDocumentId(name: string): string {
  return name.split("/").at(-1) ?? "";
}

function getStringValue(value: FirestoreValue | undefined): string {
  return value?.stringValue ?? "";
}

function getStringArrayValue(value: FirestoreValue | undefined): string[] {
  return (
    value?.arrayValue?.values
      ?.map((item) => item.stringValue?.trim() ?? "")
      .filter((item) => item !== "") ?? []
  );
}

function getItemStatus(value: FirestoreValue | undefined): Item["status"] {
  const status = getStringValue(value);

  return status === "trading" || status === "completed"
    ? status
    : "available";
}

function getItemListingType(
  value: FirestoreValue | undefined
): Item["listingType"] {
  return getStringValue(value) === "warehouse" ? "warehouse" : "direct";
}

function getWarehouseUseCases(
  value: FirestoreValue | undefined
): Item["warehouseUseCases"] {
  return getStringArrayValue(value).filter(
    (useCase): useCase is Item["warehouseUseCases"][number] =>
      useCase === "ai_route" || useCase === "gacha"
  );
}

function getIntegerValue(value: FirestoreValue | undefined): number {
  const parsed = Number(value?.integerValue ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTimestampValue(value: FirestoreValue | undefined): string {
  return value?.timestampValue ?? new Date().toISOString();
}
