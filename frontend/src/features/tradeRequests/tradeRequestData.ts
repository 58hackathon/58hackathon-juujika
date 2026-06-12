import type { TradeRequest } from "./tradeRequestTypes";

export const demoTradeRequests: TradeRequest[] = [
  {
    id: "request_1",
    targetItemId: "item_10",
    targetItemTitle: "NIKE エアフォース1",
    offeredItemId: "item_9",
    offeredItemTitle: "通学用バックパック",
    requesterId: "user_2",
    requesterName: "you_07",
    receiverId: "current_user",
    receiverName: "you",
    message: "ぜひ交換したいです。大切に使います。",
    status: "pending",
    createdAt: "2026-06-08T12:00:00.000Z",
  },
];
