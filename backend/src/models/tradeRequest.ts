export type TradeRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed";

export type TradeRequest = {
  id: string;
  targetItemId: string;
  targetItemTitle: string;
  offeredItemId: string;
  offeredItemTitle: string;
  requesterId: string;
  requesterName: string;
  receiverId: string;
  receiverName: string;
  message: string;
  status: TradeRequestStatus;
  createdAt: string;
};

export type CreateTradeRequestInput = {
  targetItemId: string;
  offeredItemId: string;
  targetItemTitle?: string;
  offeredItemTitle?: string;
  requesterId?: string;
  requesterName?: string;
  receiverId?: string;
  receiverName?: string;
  message?: string;
};

export type TradeSuggestionItem = {
  id: string;
  title: string;
  category?: string;
  description?: string;
  wantedItem?: string;
  ownerName?: string;
};

export type TradeSuggestionInput = {
  targetItem: TradeSuggestionItem;
  candidateItems: TradeSuggestionItem[];
  limit?: number;
};

export type TradeSuggestion = {
  itemId: string;
  title: string;
  score: number;
  reason: string;
};

export type TradeSuggestionResponse = {
  suggestions: TradeSuggestion[];
  source: "gemini" | "fallback";
};

export const tradeRequestStatuses: TradeRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "completed",
];
