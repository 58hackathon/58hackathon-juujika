import type { Request, Response } from "express";

import type { CreateUserInput, ShippingAddress } from "../models/user.js";
import {
  createUser,
  getUserById,
  getUsers,
  isUserPlan,
} from "../services/userService.js";

export function listUsers(_req: Request, res: Response): void {
  res.json({ data: getUsers() });
}

export function getUser(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const user = getUserById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ data: user });
}

export function postUser(req: Request, res: Response): void {
  const input = toCreateUserInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  const user = createUser(input);
  if (!user) {
    res.status(409).json({ error: "email is already registered" });
    return;
  }

  res.status(201).json({ data: user });
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
