import { createHash, randomBytes } from "node:crypto";

import type { CreateUserInput, ShippingAddress, User, UserPlan } from "../models/user.js";
import { userPlans } from "../models/user.js";

const usersCollectionName = "users";
const firestoreDatabaseId = "(default)";

type FirebaseConfig = {
  apiKey: string;
  projectId: string;
};

type StoredUser = User & {
  passwordHash: string;
  authTokenHash: string;
};

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreListResponse = {
  documents?: FirestoreDocument[];
};

type FirestoreRunQueryResponse = Array<{
  document?: FirestoreDocument;
}>;

type FirestoreValue = {
  stringValue?: string;
  timestampValue?: string;
  mapValue?: {
    fields?: Record<string, FirestoreValue>;
  };
};

const users: StoredUser[] = [];
let nextUserNumber = users.length + 1;

export class UserServiceError extends Error {
  constructor(message: string, readonly statusCode = 500) {
    super(message);
    this.name = "UserServiceError";
  }
}

export async function getUsers(): Promise<User[]> {
  if (!hasFirebaseConfig()) {
    return users.map((user) => toUserResponse(user));
  }

  const response = await requestFirestore<FirestoreListResponse>(
    `/${usersCollectionName}`
  );

  return (response.documents ?? [])
    .map(toStoredUser)
    .map((user) => toUserResponse(user))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (!hasFirebaseConfig()) {
    const user = users.find((currentUser) => currentUser.id === id);
    return user ? toUserResponse(user) : undefined;
  }

  try {
    const document = await requestFirestore<FirestoreDocument>(
      `/${usersCollectionName}/${id}`
    );
    return toUserResponse(toStoredUser(document));
  } catch (error) {
    if (error instanceof UserServiceError && error.statusCode === 404) {
      return undefined;
    }

    throw error;
  }
}

export async function getUserByToken(token: string): Promise<User | undefined> {
  const tokenHash = hashValue(token);

  if (!hasFirebaseConfig()) {
    const user = users.find((currentUser) => currentUser.authTokenHash === tokenHash);
    return user ? toUserResponse(user) : undefined;
  }

  const rows = await queryUsersByField("authTokenHash", tokenHash);
  const document = rows.find((row) => row.document)?.document;
  return document ? toUserResponse(toStoredUser(document)) : undefined;
}

export async function createUser(input: CreateUserInput): Promise<User | undefined> {
  const email = normalizeEmail(input.email);
  if (await isEmailRegistered(email)) return undefined;

  const authToken = randomBytes(32).toString("base64url");
  const user: StoredUser = {
    id: createUserId(),
    username: input.username,
    email,
    plan: input.plan,
    shippingAddress: { ...input.shippingAddress },
    passwordHash: hashValue(input.password),
    authTokenHash: hashValue(authToken),
    createdAt: new Date().toISOString(),
  };

  if (!hasFirebaseConfig()) {
    users.push(user);
    return toUserResponse(user, authToken);
  }

  const document = await requestFirestore<FirestoreDocument>(
    `/${usersCollectionName}/${user.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toFirestoreDocument(user)),
    }
  );

  return toUserResponse(toStoredUser(document), authToken);
}

export function isUserPlan(value: unknown): value is UserPlan {
  return typeof value === "string" && userPlans.includes(value as UserPlan);
}

async function isEmailRegistered(email: string): Promise<boolean> {
  if (!hasFirebaseConfig()) {
    return users.some((user) => user.email === email);
  }

  const rows = await queryUsersByField("email", email);
  return rows.some((row) => row.document !== undefined);
}

async function queryUsersByField(
  fieldPath: string,
  value: string
): Promise<FirestoreRunQueryResponse> {
  return requestFirestore<FirestoreRunQueryResponse>(":runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: usersCollectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
        limit: 1,
      },
    }),
  });
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
    throw new UserServiceError(
      message || "Firestore users request failed",
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
    throw new UserServiceError(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY in backend/.env.",
      503
    );
  }

  return { apiKey, projectId };
}

function toFirestoreDocument(user: StoredUser): FirestoreDocument {
  return {
    fields: {
      id: { stringValue: user.id },
      username: { stringValue: user.username },
      email: { stringValue: user.email },
      plan: { stringValue: user.plan },
      shippingAddress: toFirestoreShippingAddress(user.shippingAddress),
      passwordHash: { stringValue: user.passwordHash },
      authTokenHash: { stringValue: user.authTokenHash },
      createdAt: { timestampValue: user.createdAt },
    },
  };
}

function toFirestoreShippingAddress(
  shippingAddress: ShippingAddress
): FirestoreValue {
  return {
    mapValue: {
      fields: {
        postalCode: { stringValue: shippingAddress.postalCode },
        prefectureCity: { stringValue: shippingAddress.prefectureCity },
        addressLine: { stringValue: shippingAddress.addressLine },
        building: { stringValue: shippingAddress.building ?? "" },
      },
    },
  };
}

function toStoredUser(document: FirestoreDocument): StoredUser {
  const fields = document.fields ?? {};

  return {
    id: getStringValue(fields.id) || getDocumentId(document.name ?? ""),
    username: getStringValue(fields.username),
    email: getStringValue(fields.email),
    plan: getUserPlan(fields.plan),
    shippingAddress: getShippingAddress(fields.shippingAddress),
    passwordHash: getStringValue(fields.passwordHash),
    authTokenHash: getStringValue(fields.authTokenHash),
    createdAt: getTimestampValue(fields.createdAt),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createUserId(): string {
  const timestampId = `user_${Date.now()}`;
  if (!users.some((user) => user.id === timestampId)) {
    return timestampId;
  }

  let id = `user_${nextUserNumber}`;
  while (users.some((user) => user.id === id)) {
    nextUserNumber += 1;
    id = `user_${nextUserNumber}`;
  }

  nextUserNumber += 1;
  return id;
}

function toUserResponse(user: StoredUser, authToken?: string): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    shippingAddress: { ...user.shippingAddress },
    createdAt: user.createdAt,
    ...(authToken ? { authToken } : {}),
  };
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function getUserPlan(value: FirestoreValue | undefined): UserPlan {
  const plan = getStringValue(value);
  return isUserPlan(plan) ? plan : "free";
}

function getShippingAddress(value: FirestoreValue | undefined): ShippingAddress {
  const fields = value?.mapValue?.fields ?? {};

  return {
    postalCode: getStringValue(fields.postalCode),
    prefectureCity: getStringValue(fields.prefectureCity),
    addressLine: getStringValue(fields.addressLine),
    building: getStringValue(fields.building) || undefined,
  };
}
