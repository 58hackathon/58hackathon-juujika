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

