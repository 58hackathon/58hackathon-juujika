import { demoTradeRequests } from "./tradeRequestData";
import type { TradeRequest, TradeRequestStatus } from "./tradeRequestTypes";

let fallbackTradeRequests: TradeRequest[] = [...demoTradeRequests];

export async function getTradeRequests(): Promise<TradeRequest[]> {
  return fallbackTradeRequests;
}

export async function createTradeRequest(input: {
  targetItemId: string;
  targetItemTitle: string;
  offeredItemId: string;
  offeredItemTitle: string;
  requesterId: string;
  requesterName: string;
  receiverId: string;
  receiverName: string;
  message: string;
}): Promise<TradeRequest> {
  const tradeRequest: TradeRequest = {
    id: `request_${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };

  fallbackTradeRequests = [tradeRequest, ...fallbackTradeRequests];
  return tradeRequest;
}

export async function updateTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): Promise<TradeRequest | undefined> {
  const request = fallbackTradeRequests.find((tradeRequest) => tradeRequest.id === id);
  if (!request) return undefined;

  const updatedRequest = {
    ...request,
    status,
  };

  fallbackTradeRequests = fallbackTradeRequests.map((tradeRequest) =>
    tradeRequest.id === id ? updatedRequest : tradeRequest
  );

  return updatedRequest;
}
