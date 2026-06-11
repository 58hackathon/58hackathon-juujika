import type { Request, Response } from "express";

import type {
  CreateTradeRequestInput,
  TradeRequestStatus,
} from "../models/tradeRequest.js";
import {
  createTradeRequest as createTradeRequestRecord,
  getTradeRequestById,
  getTradeRequests as getTradeRequestRecords,
  isTradeRequestStatus,
  updateTradeRequestStatus,
} from "../services/tradeRequestService.js";

const requiredCreateFields = [
  "targetItemId",
  "offeredItemId",
] as const;

export function listTradeRequests(req: Request, res: Response): void {
  const status = getQueryParam(req.query.status);
  if (status !== undefined && !isTradeRequestStatus(status)) {
    res.status(400).json({
      error: "status must be one of: pending, approved, rejected, completed",
    });
    return;
  }

  res.json(
    getTradeRequestRecords({
      status,
      requesterId: getQueryParam(req.query.requesterId),
      receiverId: getQueryParam(req.query.receiverId),
      targetItemId: getQueryParam(req.query.targetItemId),
      offeredItemId: getQueryParam(req.query.offeredItemId),
    })
  );
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

  res.json(tradeRequest);
}

export function postTradeRequest(req: Request, res: Response): void {
  const input = toCreateTradeRequestInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  const tradeRequest = createTradeRequestRecord(input);
  res.status(201).json(tradeRequest);
}

export function patchTradeRequestStatus(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const status = getRequestStatus(req.body);
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

  res.json(tradeRequest);
}

function toCreateTradeRequestInput(
  value: unknown
): CreateTradeRequestInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const requiredValues: Record<(typeof requiredCreateFields)[number], string> = {
    targetItemId: "",
    offeredItemId: "",
  };

  for (const field of requiredCreateFields) {
    const fieldValue = getStringField(value, field);
    if (fieldValue === undefined) {
      return `${field} is required`;
    }
    requiredValues[field] = fieldValue;
  }

  const optionalStringError = validateOptionalStringFields(value, [
    "targetItemTitle",
    "offeredItemTitle",
    "requesterId",
    "requesterName",
    "receiverId",
    "receiverName",
    "message",
  ]);
  if (optionalStringError) {
    return optionalStringError;
  }

  return {
    targetItemId: requiredValues.targetItemId,
    targetItemTitle:
      getStringField(value, "targetItemTitle") ?? requiredValues.targetItemId,
    offeredItemId: requiredValues.offeredItemId,
    offeredItemTitle:
      getStringField(value, "offeredItemTitle") ?? requiredValues.offeredItemId,
    requesterId: getStringField(value, "requesterId") ?? "current_user",
    requesterName: getStringField(value, "requesterName") ?? "you",
    receiverId: getStringField(value, "receiverId") ?? "item_owner",
    receiverName: getStringField(value, "receiverName") ?? "owner",
    message: getStringField(value, "message"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function getQueryParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
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

function validateOptionalStringFields(
  value: Record<string, unknown>,
  fields: string[]
): string | undefined {
  for (const field of fields) {
    if (value[field] !== undefined && typeof value[field] !== "string") {
      return `${field} must be a string`;
    }
  }

  return undefined;
}

function getRequestStatus(value: unknown): TradeRequestStatus | undefined {
  if (!isRecord(value)) return undefined;

  const status = value.status;
  return isTradeRequestStatus(status) ? status : undefined;
}
