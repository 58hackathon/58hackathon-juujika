import type {
  CreateTradeRequestInput,
  TradeRequest,
  TradeRequestStatus,
} from "../models/tradeRequest.js";
import { tradeRequestStatuses } from "../models/tradeRequest.js";

type TradeRequestFilters = {
  status?: TradeRequestStatus;
  requesterId?: string;
  receiverId?: string;
  targetItemId?: string;
  offeredItemId?: string;
};

const tradeRequests: TradeRequest[] = [
  {
    id: "request_1",
    targetItemId: "item_1",
    targetItemTitle: "NIKE Air Force 1",
    offeredItemId: "item_2",
    offeredItemTitle: "NEW ERA cap",
    requesterId: "user_2",
    requesterName: "you_07",
    receiverId: "user_1",
    receiverName: "haru_03",
    message: "I would like to trade for this item.",
    status: "pending",
    createdAt: "2026-06-08T12:00:00.000Z",
  },
];

let nextTradeRequestNumber = tradeRequests.length + 1;

export function getTradeRequests(filters: TradeRequestFilters = {}): TradeRequest[] {
  return tradeRequests
    .filter((tradeRequest) => matchesTradeRequestFilters(tradeRequest, filters))
    .map(toTradeRequestResponse);
}

export function getTradeRequestById(id: string): TradeRequest | undefined {
  const tradeRequest = findTradeRequestById(id);
  return tradeRequest ? toTradeRequestResponse(tradeRequest) : undefined;
}

export function createTradeRequest(input: CreateTradeRequestInput): TradeRequest {
  const tradeRequest: TradeRequest = {
    ...input,
    id: createTradeRequestId(),
    message: input.message ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  tradeRequests.push(tradeRequest);
  return toTradeRequestResponse(tradeRequest);
}

export function updateTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): TradeRequest | undefined {
  const tradeRequest = findTradeRequestById(id);
  if (!tradeRequest) return undefined;

  tradeRequest.status = status;
  return toTradeRequestResponse(tradeRequest);
}

export function isTradeRequestStatus(value: unknown): value is TradeRequestStatus {
  return (
    typeof value === "string" &&
    tradeRequestStatuses.includes(value as TradeRequestStatus)
  );
}

function findTradeRequestById(id: string): TradeRequest | undefined {
  return tradeRequests.find((tradeRequest) => tradeRequest.id === id);
}

function matchesTradeRequestFilters(
  tradeRequest: TradeRequest,
  filters: TradeRequestFilters
): boolean {
  return (
    matchesOptionalFilter(tradeRequest.status, filters.status) &&
    matchesOptionalFilter(tradeRequest.requesterId, filters.requesterId) &&
    matchesOptionalFilter(tradeRequest.receiverId, filters.receiverId) &&
    matchesOptionalFilter(tradeRequest.targetItemId, filters.targetItemId) &&
    matchesOptionalFilter(tradeRequest.offeredItemId, filters.offeredItemId)
  );
}

function matchesOptionalFilter(
  value: string,
  filterValue: string | undefined
): boolean {
  return filterValue === undefined || value === filterValue;
}

function createTradeRequestId(): string {
  let id = `request_${nextTradeRequestNumber}`;
  while (findTradeRequestById(id)) {
    nextTradeRequestNumber += 1;
    id = `request_${nextTradeRequestNumber}`;
  }

  nextTradeRequestNumber += 1;
  return id;
}

function toTradeRequestResponse(tradeRequest: TradeRequest): TradeRequest {
  return { ...tradeRequest };
}
