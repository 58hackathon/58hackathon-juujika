import { Router } from "express";

import {
  getAutoTradeRoute,
  getTradeRequest,
  listAutoTradeRoutes,
  listTradeRequests,
  patchAutoTradeRoute,
  patchTradeRequestStatus,
  postAutoTradeRoute,
  postTradeRequest,
  postTradeSuggestions,
} from "../controllers/tradeRequestController.js";

export const tradeRequestRoutes = Router();

tradeRequestRoutes.get("/", listTradeRequests);
tradeRequestRoutes.post("/suggestions", postTradeSuggestions);
tradeRequestRoutes.get("/auto-routes", listAutoTradeRoutes);
tradeRequestRoutes.post("/auto-routes", postAutoTradeRoute);
tradeRequestRoutes.get("/auto-routes/:id", getAutoTradeRoute);
tradeRequestRoutes.patch("/auto-routes/:id", patchAutoTradeRoute);
tradeRequestRoutes.get("/:id", getTradeRequest);
tradeRequestRoutes.post("/", postTradeRequest);
tradeRequestRoutes.patch("/:id", patchTradeRequestStatus);
tradeRequestRoutes.patch("/:id/status", patchTradeRequestStatus);
