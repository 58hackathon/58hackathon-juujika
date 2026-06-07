import { demoTradeRequests } from "./tradeRequestData";
import type { TradeRequest, TradeRequestStatus } from "./tradeRequestTypes";

export async function getTradeRequests(): Promise<TradeRequest[]> {
  return demoTradeRequests;
}

export async function updateTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): Promise<TradeRequest | undefined> {
  const request = demoTradeRequests.find((tradeRequest) => tradeRequest.id === id);
  if (!request) return undefined;

  return {
    ...request,
    status,
  };
}

