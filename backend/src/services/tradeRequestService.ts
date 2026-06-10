import type {
  CreateTradeRequestInput,
  TradeRequest,
  TradeRequestStatus,
} from "../models/tradeRequest.js";
import { tradeRequestStatuses } from "../models/tradeRequest.js";

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

export function getTradeRequests(): TradeRequest[] {
  return [...tradeRequests];
}

export function getTradeRequestById(id: string): TradeRequest | undefined {
  return tradeRequests.find((tradeRequest) => tradeRequest.id === id);
}

export function createTradeRequest(input: CreateTradeRequestInput): TradeRequest {
  const tradeRequest: TradeRequest = {
    ...input,
    id: `request_${Date.now()}`,
    message: input.message ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  tradeRequests.push(tradeRequest);
  return tradeRequest;
}

export function updateTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): TradeRequest | undefined {
  const tradeRequest = getTradeRequestById(id);
  if (!tradeRequest) return undefined;

  tradeRequest.status = status;
  return tradeRequest;
}

export function isTradeRequestStatus(value: unknown): value is TradeRequestStatus {
  return (
    typeof value === "string" &&
    tradeRequestStatuses.includes(value as TradeRequestStatus)
  );
}
