import type { RegisteredUser, RegisterUserInput } from "./userTypes";

const currentUserStorageKey = "warashibe.currentUser";

type UserResponse = {
  data: RegisteredUser;
};

type ErrorResponse = {
  error?: string;
};

export function getStoredCurrentUser(): RegisteredUser | null {
  try {
    const value = window.localStorage.getItem(currentUserStorageKey);
    if (!value) return null;

    const user = JSON.parse(value);
    return isRegisteredUser(user) ? user : null;
  } catch (error) {
    console.warn("保存されたユーザー情報を読み込めませんでした", error);
    return null;
  }
}

export function saveCurrentUser(user: RegisteredUser): void {
  window.localStorage.setItem(currentUserStorageKey, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  window.localStorage.removeItem(currentUserStorageKey);
}

export async function registerUser(
  input: RegisterUserInput
): Promise<RegisteredUser> {
  let response: Response;

  try {
    response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.warn("APIにつながらないためローカルユーザーを作成します", error);
    const fallbackUser = createFallbackUser(input);
    saveCurrentUser(fallbackUser);
    return fallbackUser;
  }

  if (!response.ok) {
    const json = await readErrorResponse(response);
    throw new Error(json.error ?? "ユーザー登録に失敗しました");
  }

  const json: UserResponse = await response.json();
  saveCurrentUser(json.data);
  return json.data;
}

function createFallbackUser(input: RegisterUserInput): RegisteredUser {
  return {
    id: `user_${Date.now()}`,
    username: input.username,
    email: input.email.trim().toLowerCase(),
    plan: input.plan,
    shippingAddress: { ...input.shippingAddress },
    createdAt: new Date().toISOString(),
  };
}

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function isRegisteredUser(value: unknown): value is RegisteredUser {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const user = value as Record<string, unknown>;
  const shippingAddress = user.shippingAddress;
  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.email === "string" &&
    typeof user.createdAt === "string" &&
    (user.plan === "free" || user.plan === "lite" || user.plan === "plus") &&
    typeof shippingAddress === "object" &&
    shippingAddress !== null &&
    !Array.isArray(shippingAddress)
  );
}
