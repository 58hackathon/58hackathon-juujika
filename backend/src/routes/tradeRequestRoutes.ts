import { Router } from "express";

import {
  getTradeRequest,
  listTradeRequests,
  patchTradeRequestStatus,
  postTradeRequest,
  postTradeSuggestions,
} from "../controllers/tradeRequestController.js";

export const tradeRequestRoutes = Router();

tradeRequestRoutes.get("/", listTradeRequests);
tradeRequestRoutes.post("/suggestions", postTradeSuggestions);
tradeRequestRoutes.get("/:id", getTradeRequest);
tradeRequestRoutes.post("/", postTradeRequest);
tradeRequestRoutes.patch("/:id", patchTradeRequestStatus);
tradeRequestRoutes.patch("/:id/status", patchTradeRequestStatus);
