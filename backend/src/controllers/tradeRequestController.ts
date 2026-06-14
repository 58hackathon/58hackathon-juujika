import type { Request, Response } from "express";

import type {
  CreateAutoTradeRouteInput,
  CreateTradeRequestInput,
  TradeSuggestionInput,
  TradeSuggestionItem,
  TradeRequestStatus,
  UpdateAutoTradeRouteInput,
} from "../models/tradeRequest.js";
import type { Item } from "../models/item.js";
import { getItems } from "../services/itemService.js";
import {
  createAutoTradeRoute as createAutoTradeRouteRecord,
  createTradeRequest as createTradeRequestRecord,
  getAutoTradeRouteById,
  getAutoTradeRoutes as getAutoTradeRouteRecords,
  getTradeRequestById,
  getTradeRequests as getTradeRequestRecords,
  isAutoTradeRouteStatus,
  isAutoTradeRouteStepStatus,
  isTradeRequestStatus,
  suggestTradeRequests,
  TradeRequestServiceError,
  updateAutoTradeRoute as updateAutoTradeRouteRecord,
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

export function listAutoTradeRoutes(req: Request, res: Response): void {
  res.json({
    data: getAutoTradeRouteRecords(getQueryParam(req.query.userId)),
  });
}

export function getAutoTradeRoute(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const autoRoute = getAutoTradeRouteById(id);
  if (!autoRoute) {
    res.status(404).json({ error: "Auto trade route not found" });
    return;
  }

  res.json({ data: autoRoute });
}

export async function postAutoTradeRoute(
  req: Request,
  res: Response
): Promise<void> {
  const input = toCreateAutoTradeRouteInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  try {
    const autoRoute = await createAutoTradeRouteRecord(input);
    res.status(201).json({ data: autoRoute });
  } catch (error) {
    if (error instanceof TradeRequestServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Auto trade route creation failed" });
  }
}

export function patchAutoTradeRoute(req: Request, res: Response): void {
  const id = getRouteParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const input = toUpdateAutoTradeRouteInput(req.body);
  if (typeof input === "string") {
    res.status(400).json({ error: input });
    return;
  }

  const autoRoute = updateAutoTradeRouteRecord(id, input);
  if (!autoRoute) {
    res.status(404).json({ error: "Auto trade route not found" });
    return;
  }

  res.json({ data: autoRoute });
}

export async function postTradeSuggestions(
  req: Request,
  res: Response
): Promise<void> {
  const input = await toTradeSuggestionInput(req.body);
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

function toCreateAutoTradeRouteInput(
  value: unknown
): CreateAutoTradeRouteInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const userId = getStringField(value, "userId");
  if (!userId) {
    return "userId is required";
  }

  const sourceItemId = getStringField(value, "sourceItemId");
  if (!sourceItemId) {
    return "sourceItemId is required";
  }

  const goalItemId = getStringField(value, "goalItemId");
  if (!goalItemId) {
    return "goalItemId is required";
  }

  const autoApply = getOptionalBooleanField(value, "autoApply");
  if (typeof autoApply === "string") {
    return autoApply;
  }

  return {
    userId,
    sourceItemId,
    goalItemId,
    userName: getStringField(value, "userName"),
    autoApply,
  };
}

function toUpdateAutoTradeRouteInput(
  value: unknown
): UpdateAutoTradeRouteInput | string {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  const status = value.status;
  if (status !== undefined && !isAutoTradeRouteStatus(status)) {
    return "status must be one of: running, paused, completed, stopped";
  }

  const stepId = getStringField(value, "stepId");
  const stepStatus = value.stepStatus;
  if (stepStatus !== undefined && !isAutoTradeRouteStepStatus(stepStatus)) {
    return "stepStatus must be one of: ready, requested, approved, completed";
  }

  if ((stepId && stepStatus === undefined) || (!stepId && stepStatus !== undefined)) {
    return "stepId and stepStatus must be provided together";
  }

  return {
    status: isAutoTradeRouteStatus(status) ? status : undefined,
    stepId,
    stepStatus: isAutoTradeRouteStepStatus(stepStatus) ? stepStatus : undefined,
  };
}

async function toTradeSuggestionInput(
  value: unknown
): Promise<TradeSuggestionInput | string> {
  if (!isRecord(value)) {
    return "request body must be an object";
  }

  if (value.sourceItemId !== undefined || value.candidateItemIds !== undefined) {
    return toTradeSuggestionInputFromIds(value);
  }

  return toTradeSuggestionInputFromItems(value);
}

function toTradeSuggestionInputFromItems(
  value: Record<string, unknown>
): TradeSuggestionInput | string {
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

async function toTradeSuggestionInputFromIds(
  value: Record<string, unknown>
): Promise<TradeSuggestionInput | string> {
  const sourceItemId = getStringField(value, "sourceItemId");
  if (!sourceItemId) {
    return "sourceItemId is required";
  }

  const candidateItemIds = getStringArrayField(value, "candidateItemIds");
  if (typeof candidateItemIds === "string") {
    return candidateItemIds;
  }

  const limit = getOptionalNumberField(value, "limit");
  if (typeof limit === "string") {
    return limit;
  }

  const itemById = await getItemMap();

  return {
    targetItem: toTradeSuggestionItemFromItem(
      itemById.get(sourceItemId),
      sourceItemId
    ),
    candidateItems: candidateItemIds.map((itemId) =>
      toTradeSuggestionItemFromItem(itemById.get(itemId), itemId)
    ),
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

async function getItemMap(): Promise<Map<string, Item>> {
  try {
    const items = await getItems();
    return new Map(items.map((item) => [item.id, item]));
  } catch {
    return new Map();
  }
}

function toTradeSuggestionItemFromItem(
  item: Item | undefined,
  fallbackId: string
): TradeSuggestionItem {
  if (!item) {
    return {
      id: fallbackId,
      title: fallbackId,
    };
  }

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    wantedItem: item.wantedItem,
    ownerName: item.ownerName,
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

function getStringArrayField(
  value: Record<string, unknown>,
  field: string
): string[] | string {
  const fieldValue = value[field];
  if (!Array.isArray(fieldValue)) {
    return `${field} must be an array`;
  }

  const values = fieldValue
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item !== "");

  if (values.length !== fieldValue.length) {
    return `${field} must contain only strings`;
  }

  return values;
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

function getOptionalBooleanField(
  value: Record<string, unknown>,
  field: string
): boolean | undefined | string {
  const fieldValue = value[field];
  if (fieldValue === undefined) return undefined;
  if (typeof fieldValue !== "boolean") {
    return `${field} must be a boolean`;
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
