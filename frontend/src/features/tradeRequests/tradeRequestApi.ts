import { demoTradeRequests } from "./tradeRequestData";
import type { TradeRequest, TradeRequestStatus } from "./tradeRequestTypes";

let fallbackTradeRequests: TradeRequest[] = [...demoTradeRequests];

export async function getTradeRequests(): Promise<TradeRequest[]> {
  try {
    const response = await fetch("/api/trade-requests");
    if (!response.ok) {
      throw new Error("Failed to fetch trade requests");
    }

    const json: TradeRequest[] = await response.json();
    return json;
  } catch (error) {
    console.warn("交換申請APIにつながらないためローカル申請を表示します", error);
    return fallbackTradeRequests;
  }
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
  try {
    const response = await fetch("/api/trade-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to create trade request");
    }

    const tradeRequest: TradeRequest = await response.json();
    return tradeRequest;
  } catch (error) {
    console.warn("交換申請APIにつながらないためローカル申請を作成します", error);
    return createFallbackTradeRequest(input);
  }
}

function createFallbackTradeRequest(input: {
  targetItemId: string;
  targetItemTitle: string;
  offeredItemId: string;
  offeredItemTitle: string;
  requesterId: string;
  requesterName: string;
  receiverId: string;
  receiverName: string;
  message: string;
}): TradeRequest {
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
  try {
    const response = await fetch(`/api/trade-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Failed to update trade request");
    }

    const tradeRequest: TradeRequest = await response.json();
    return tradeRequest;
  } catch (error) {
    console.warn("交換申請APIにつながらないためローカル申請を更新します", error);
    return updateFallbackTradeRequestStatus(id, status);
  }
}

function updateFallbackTradeRequestStatus(
  id: string,
  status: TradeRequestStatus
): TradeRequest | undefined {
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
