import { Router } from "express";

import {
  getTradeRequest,
  listTradeRequests,
  patchTradeRequestStatus,
  postTradeRequest,
} from "../controllers/tradeRequestController.js";

export const tradeRequestRoutes = Router();

tradeRequestRoutes.get("/", listTradeRequests);
tradeRequestRoutes.get("/:id", getTradeRequest);
tradeRequestRoutes.post("/", postTradeRequest);
tradeRequestRoutes.patch("/:id/status", patchTradeRequestStatus);
