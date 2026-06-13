import type { Item } from "../items/itemTypes";

export type AiRouteStep = {
  itemId: string;
  title: string;
  imageUrl: string;
  matchReason: string;
};

export type AiTradeRoute = {
  id: string;
  title: string;
  matchScore: number;
  summary: string;
  source: "gemini" | "fallback" | "mock";
  steps: AiRouteStep[];
  traceReasons: string[];
};

export type AiTradeRouteRequest = {
  sourceItemId: string;
  goalItemId: string;
  items: Item[];
  limit?: number;
};
