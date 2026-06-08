import type { Request, Response } from "express";

import type { CreateTradeRequestInput } from "../models/tradeRequest.js";
import {
  createTradeRequest,
  getTradeRequestById,
  getTradeRequests,
  isTradeRequestStatus,
  updateTradeRequestStatus,
} from "../services/tradeRequestService.js";

const requiredCreateFields = [
  "targetItemId",
  "targetItemTitle",
  "offeredItemId",
  "offeredItemTitle",
  "requesterId",
  "requesterName",
  "receiverId",
  "receiverName",
] as const;

export function listTradeRequests(_req: Request, res: Response): void {
  res.json({ data: getTradeRequests() });
}

export function getTradeRequest(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const tradeRequest = getTradeRequestById(id);
  if (!tradeRequest) {
    res.status(404).json({ error: "Trade request not found" });
    return;
  }

  res.json({ data: tradeRequest });
}

export function postTradeRequest(req: Request, res: Response): void {
  const validationError = validateCreateTradeRequestInput(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const tradeRequest = createTradeRequest(req.body);
  res.status(201).json({ data: tradeRequest });
}

export function patchTradeRequestStatus(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const { status } = req.body as { status?: unknown };
  if (!isTradeRequestStatus(status)) {
    res.status(400).json({
      error: "status must be one of: pending, approved, rejected, completed",
    });
    return;
  }

  const tradeRequest = updateTradeRequestStatus(id, status);
  if (!tradeRequest) {
    res.status(404).json({ error: "Trade request not found" });
    return;
  }

  res.json({ data: tradeRequest });
}

function validateCreateTradeRequestInput(
  value: unknown
): string | undefined {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  for (const field of requiredCreateFields) {
    if (typeof value[field] !== "string" || value[field].trim() === "") {
      return `${field} is required`;
    }
  }

  if (value.message !== undefined && typeof value.message !== "string") {
    return "message must be a string";
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
