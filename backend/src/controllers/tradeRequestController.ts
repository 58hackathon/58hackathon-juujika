import type { Request, Response } from "express";

import type {
  CreateTradeRequestInput,
  TradeSuggestionInput,
  TradeSuggestionItem,
  TradeRequestStatus,
} from "../models/tradeRequest.js";
import {
  createTradeRequest as createTradeRequestRecord,
  getTradeRequestById,
  getTradeRequests as getTradeRequestRecords,
  isTradeRequestStatus,
  suggestTradeRequests,
  updateTradeRequestStatus,
} from "../services/tradeRequestService.js";

const requiredCreateFields = [
  "targetItemId",
  "offeredItemId",
] as const;

const optionalCreateFields = [
  "targetItemTitle",
  "offeredItemTitle",
  "requesterId",
  "requesterName",
  "receiverId",
  "receiverName",
  "message",
] as const;

const optionalSuggestionItemFields = [
  "category",
  "description",
  "wantedItem",
  "ownerName",
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

export async function postTradeSuggestions(
  req: Request,
  res: Response
): Promise<void> {
  const input = toTradeSuggestionInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  const result = await suggestTradeRequests(input);
  res.json(result);
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

  const optionalStringError = validateOptionalStringFields(
    value,
    optionalCreateFields
  );
  if (optionalStringError) {
    return optionalStringError;
  }

  const input: CreateTradeRequestInput = {
    targetItemId: requiredValues.targetItemId,
    offeredItemId: requiredValues.offeredItemId,
  };

  for (const field of optionalCreateFields) {
    const fieldValue = getStringField(value, field);
    if (fieldValue !== undefined) {
      input[field] = fieldValue;
    }
  }

  return input;
}

function toTradeSuggestionInput(value: unknown): TradeSuggestionInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const targetItem = toTradeSuggestionItem(value.targetItem, "targetItem");
  if (typeof targetItem === "string") {
    return targetItem;
  }

  if (!Array.isArray(value.candidateItems)) {
    return "candidateItems must be an array";
  }

  const candidateItems: TradeSuggestionItem[] = [];
  for (const candidateValue of value.candidateItems) {
    const candidateItem = toTradeSuggestionItem(
      candidateValue,
      "candidateItems"
    );
    if (typeof candidateItem === "string") {
      return candidateItem;
    }
    candidateItems.push(candidateItem);
  }

  const limit = getOptionalNumberField(value, "limit");
  if (typeof limit === "string") {
    return limit;
  }

  return {
    targetItem,
    candidateItems,
    limit,
  };
}

function toTradeSuggestionItem(
  value: unknown,
  label: string
): TradeSuggestionItem | string {
  if (!isRecord(value)) {
    return `${label} must be an object`;
  }

  const id = getStringField(value, "id");
  if (!id) {
    return `${label}.id is required`;
  }

  const title = getStringField(value, "title");
  if (!title) {
    return `${label}.title is required`;
  }

  const item: TradeSuggestionItem = { id, title };
  for (const field of optionalSuggestionItemFields) {
    const fieldValue = getStringField(value, field);
    if (fieldValue !== undefined) {
      item[field] = fieldValue;
    }
  }

  return item;
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

function getOptionalNumberField(
  value: Record<string, unknown>,
  field: string
): number | undefined | string {
  const fieldValue = value[field];
  if (fieldValue === undefined) return undefined;
  if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue)) {
    return `${field} must be a number`;
  }

  return fieldValue;
}

function validateOptionalStringFields(
  value: Record<string, unknown>,
  fields: readonly string[]
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
