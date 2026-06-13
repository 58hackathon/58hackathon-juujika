import type { Request, Response } from "express";

import {
  createItem,
  getGachaItem as getGachaItemResult,
  getItemById,
  getItems,
  ItemServiceError,
} from "../services/itemService.js";
import type { ItemGachaInput } from "../models/item.js";

const requiredCreateItemFields = [
  "title",
  "description",
  "ownerId",
  "ownerName",
  "category",
] as const;

export async function listItems(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ data: await getItems() });
  } catch (error) {
    sendItemError(res, error);
  }
}

export async function getItem(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  try {
    const item = await getItemById(id);

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ data: item });
  } catch (error) {
    sendItemError(res, error);
  }
}

export async function getGachaItem(req: Request, res: Response): Promise<void> {
  const input = toGachaInput(req.query);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  try {
    const result = await getGachaItemResult(input);
    if (!result) {
      res.status(404).json({ error: "No gacha candidates found" });
      return;
    }

    res.json({ data: result });
  } catch (error) {
    sendItemError(res, error);
  }
}

export async function postItem(req: Request, res: Response): Promise<void> {
  const missingFields = requiredCreateItemFields.filter((field) => {
    const value = req.body[field];
    return typeof value !== "string" || value.trim() === "";
  });
  const wantedItems = getWantedItems(req.body.wantedItems, req.body.wantedItem);
  const price = Number(req.body.price);
  const hasValidPrice = Number.isInteger(price) && price > 0;

  if (missingFields.length > 0 || wantedItems.length === 0 || !hasValidPrice) {
    res.status(400).json({
      error: "Missing required item fields",
      fields: [
        ...missingFields,
        ...(wantedItems.length === 0 ? ["wantedItem"] : []),
        ...(!hasValidPrice ? ["price"] : []),
      ],
    });
    return;
  }

  try {
    const item = await createItem({
      ...req.body,
      price,
      wantedItems,
      condition: getOptionalString(req.body.condition),
      imageUrls: getStringArray(req.body.imageUrls, req.body.imageUrl),
    });

    res.status(201).json({ data: item });
  } catch (error) {
    sendItemError(res, error);
  }
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function toGachaInput(value: Request["query"]): ItemGachaInput | string {
  const minPrice = getOptionalQueryNumber(value.minPrice, "minPrice");
  if (typeof minPrice === "string") {
    return minPrice;
  }

  const maxPrice = getOptionalQueryNumber(value.maxPrice, "maxPrice");
  if (typeof maxPrice === "string") {
    return maxPrice;
  }

  return {
    userId: getQueryParam(value.userId),
    excludeItemId: getQueryParam(value.excludeItemId),
    sourceItemId: getQueryParam(value.sourceItemId),
    category: getQueryParam(value.category),
    minPrice,
    maxPrice,
  };
}

function getQueryParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function getOptionalQueryNumber(
  value: unknown,
  field: string
): number | undefined | string {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    return `${field} must be a number`;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return `${field} must be a number`;
  }

  return numberValue;
}

function getWantedItems(
  values: unknown,
  fallbackValue: unknown
): string[] {
  return getStringArray(values, fallbackValue);
}

function getStringArray(values: unknown, fallbackValue: unknown): string[] {
  if (Array.isArray(values)) {
    return values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value !== "");
  }

  if (typeof fallbackValue === "string" && fallbackValue.trim() !== "") {
    return fallbackValue
      .split(/[,\n]/u)
      .map((value) => value.trim())
      .filter((value) => value !== "");
  }

  return [];
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function sendItemError(res: Response, error: unknown): void {
  if (error instanceof ItemServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Unexpected item API error" });
}
