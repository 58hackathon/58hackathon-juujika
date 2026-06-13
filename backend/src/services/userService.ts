import type { CreateUserInput, User, UserPlan } from "../models/user.js";
import { userPlans } from "../models/user.js";

const users: User[] = [];
let nextUserNumber = users.length + 1;

export function getUsers(): User[] {
  return users.map(toUserResponse);
}

export function getUserById(id: string): User | undefined {
  const user = users.find((currentUser) => currentUser.id === id);
  return user ? toUserResponse(user) : undefined;
}

export function createUser(input: CreateUserInput): User | undefined {
  const email = normalizeEmail(input.email);
  if (isEmailRegistered(email)) return undefined;

  const user: User = {
    id: createUserId(),
    username: input.username,
    email,
    plan: input.plan,
    shippingAddress: { ...input.shippingAddress },
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return toUserResponse(user);
}

export function isUserPlan(value: unknown): value is UserPlan {
  return typeof value === "string" && userPlans.includes(value as UserPlan);
}

function isEmailRegistered(email: string): boolean {
  return users.some((user) => user.email === email);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createUserId(): string {
  let id = `user_${nextUserNumber}`;
  while (users.some((user) => user.id === id)) {
    nextUserNumber += 1;
    id = `user_${nextUserNumber}`;
  }

  nextUserNumber += 1;
  return id;
}

function toUserResponse(user: User): User {
  return {
    ...user,
    shippingAddress: { ...user.shippingAddress },
  };
}
