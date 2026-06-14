import type { Request, Response } from "express";

import type {
  CreateFavoriteInput,
  DeleteFavoriteInput,
  FavoriteScope,
} from "../models/favorite.js";
import {
  createFavorite,
  deleteFavorite,
  FavoriteServiceError,
  getFavorites,
} from "../services/favoriteService.js";

export async function listFavorites(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getQueryParam(req.query.userId);
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const scope = getFavoriteScope(req.query.scope);

  try {
    const favorites = await getFavorites(userId, scope);
    res.json({
      data: favorites,
      itemIds: favorites.map((favorite) => favorite.itemId),
      scope,
    });
  } catch (error) {
    respondFavoriteError(error, res);
  }
}

export async function postFavorite(
  req: Request,
  res: Response
): Promise<void> {
  const input = toCreateFavoriteInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  try {
    const favorite = await createFavorite(input);
    res.status(201).json({ data: favorite });
  } catch (error) {
    respondFavoriteError(error, res);
  }
}

export async function removeFavorite(
  req: Request,
  res: Response
): Promise<void> {
  const input = toDeleteFavoriteInput(req);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  try {
    const deleted = await deleteFavorite(input);
    res.json({ data: { ...input, deleted } });
  } catch (error) {
    respondFavoriteError(error, res);
  }
}

function toCreateFavoriteInput(value: unknown): CreateFavoriteInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const userId = getStringField(value, "userId");
  if (!userId) {
    return "userId is required";
  }

  const itemId = getStringField(value, "itemId");
  if (!itemId) {
    return "itemId is required";
  }

  const scope = getFavoriteScope(value.scope);

  return { userId, itemId, scope };
}

function toDeleteFavoriteInput(req: Request): DeleteFavoriteInput | string {
  const userId = getQueryParam(req.query.userId);
  if (!userId) {
    return "userId is required";
  }

  const itemId = getRouteParam(req.params.itemId);
  if (!itemId) {
    return "itemId is required";
  }

  const scope = getFavoriteScope(req.query.scope);

  return { userId, itemId, scope };
}

function respondFavoriteError(error: unknown, res: Response): void {
  if (error instanceof FavoriteServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Unexpected favorites error" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function getQueryParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function getFavoriteScope(value: unknown): FavoriteScope {
  return value === "ai_warehouse" ? "ai_warehouse" : "market";
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
