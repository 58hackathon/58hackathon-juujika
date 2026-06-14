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

export type AutoTradeRouteStatus =
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export type AutoTradeRouteStepStatus =
  | "ready"
  | "requested"
  | "approved"
  | "completed";

export type AutoTradeRouteStep = {
  id: string;
  fromItemId: string;
  fromItemTitle: string;
  toItemId: string;
  toItemTitle: string;
  status: AutoTradeRouteStepStatus;
  tradeRequestId?: string;
  requestedAt?: string;
  updatedAt?: string;
};

export type AutoTradeRoute = {
  id: string;
  userId: string;
  userName: string;
  sourceItemId: string;
  sourceItemTitle: string;
  goalItemId: string;
  goalItemTitle: string;
  candidateItemId?: string;
  candidateItemTitle?: string;
  status: AutoTradeRouteStatus;
  matchScore: number;
  source: TradeSuggestionResponse["source"];
  summary: string;
  highValueNotice?: string;
  steps: AutoTradeRouteStep[];
  traceReasons: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAutoTradeRouteInput = {
  userId: string;
  userName?: string;
  sourceItemId: string;
  goalItemId: string;
  autoApply?: boolean;
};

export type UpdateAutoTradeRouteInput = {
  status?: AutoTradeRouteStatus;
  stepId?: string;
  stepStatus?: AutoTradeRouteStepStatus;
};

export const tradeRequestStatuses: TradeRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "completed",
];

export const autoTradeRouteStatuses: AutoTradeRouteStatus[] = [
  "running",
  "paused",
  "completed",
  "stopped",
];

export const autoTradeRouteStepStatuses: AutoTradeRouteStepStatus[] = [
  "ready",
  "requested",
  "approved",
  "completed",
];
