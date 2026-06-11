import cors from "cors";
import express from "express";

import { tradeRequestRoutes } from "./routes/tradeRequestRoutes.js";

export const app = express();

const tradeRequestRoutePrefixes = ["/trade-requests", "/api/trade-requests"];

app.use(cors());
app.use(express.json());

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "warashibe-backend",
    status: "ok",
    endpoints: {
      health: ["/health", "/api/health"],
      tradeRequests: tradeRequestRoutePrefixes,
      aiTradeRoutes: tradeRequestRoutePrefixes.map(
        (prefix) => `${prefix}/ai-routes`
      ),
    },
  });
});

for (const prefix of tradeRequestRoutePrefixes) {
  app.use(prefix, tradeRequestRoutes);
}
