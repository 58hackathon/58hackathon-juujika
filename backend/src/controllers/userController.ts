import type { Request, Response } from "express";

import type { CreateUserInput, ShippingAddress } from "../models/user.js";
import {
  createUser,
  getUserByToken,
  getUserById,
  getUsers,
  isUserPlan,
  UserServiceError,
} from "../services/userService.js";

export async function listUsers(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ data: await getUsers() });
  } catch (error) {
    sendUserError(res, error);
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  try {
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    sendUserError(res, error);
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Bearer token is required" });
    return;
  }

  try {
    const user = await getUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    sendUserError(res, error);
  }
}

export async function postUser(req: Request, res: Response): Promise<void> {
  const input = toCreateUserInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  try {
    const user = await createUser(input);
    if (!user) {
      res.status(409).json({ error: "email is already registered" });
      return;
    }

    res.status(201).json({ data: user });
  } catch (error) {
    sendUserError(res, error);
  }
}

function toCreateUserInput(value: unknown): CreateUserInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const username = getStringField(value, "username");
  if (!username) return "username is required";

  const email = getStringField(value, "email");
  if (!email) return "email is required";
  if (!isValidEmail(email)) return "email must be valid";

  const password = getStringField(value, "password");
  if (!password) return "password is required";
  if (password.length < 8) return "password must be at least 8 characters";

  const planValue = value.plan ?? "free";
  if (!isUserPlan(planValue)) {
    return "plan must be one of: free, lite, plus";
  }

  const shippingAddress = toShippingAddress(value.shippingAddress);
  if (typeof shippingAddress === "string") return shippingAddress;

  return {
    username,
    email,
    password,
    plan: planValue,
    shippingAddress,
  };
}

function toShippingAddress(value: unknown): ShippingAddress | string {
  if (!isRecord(value)) return "shippingAddress is required";

  const postalCode = getStringField(value, "postalCode");
  if (!postalCode) return "shippingAddress.postalCode is required";

  const prefectureCity = getStringField(value, "prefectureCity");
  if (!prefectureCity) return "shippingAddress.prefectureCity is required";

  const addressLine = getStringField(value, "addressLine");
  if (!addressLine) return "shippingAddress.addressLine is required";

  return {
    postalCode,
    prefectureCity,
    addressLine,
    building: getStringField(value, "building"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function getStringField(
  value: Record<string, unknown>,
  field: string
): string | undefined {
  const fieldValue = value[field];
  return typeof fieldValue === "string" && fieldValue.trim() !== ""
    ? fieldValue.trim()
    : undefined;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getBearerToken(value: string | undefined): string | undefined {
  if (!value?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = value.slice("Bearer ".length).trim();
  return token === "" ? undefined : token;
}

function sendUserError(res: Response, error: unknown): void {
  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Unexpected user API error" });
}
