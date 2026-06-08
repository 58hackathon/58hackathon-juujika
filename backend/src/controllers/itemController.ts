import type { Request, Response } from "express";

import { createItem, getItemById, getItems } from "../services/itemService.js";

const requiredCreateItemFields = [
  "title",
  "description",
  "ownerId",
  "ownerName",
  "wantedItem",
  "category",
] as const;

export function listItems(_req: Request, res: Response): void {
  res.json({ data: getItems() });
}

export function getItem(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const item = getItemById(id);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({ data: item });
}

export function postItem(req: Request, res: Response): void {
  const missingFields = requiredCreateItemFields.filter((field) => {
    const value = req.body[field];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missingFields.length > 0) {
    res.status(400).json({
      error: "Missing required item fields",
      fields: missingFields,
    });
    return;
  }

  res.status(201).json({ data: createItem(req.body) });
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
