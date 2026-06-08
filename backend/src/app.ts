import cors from "cors";
import express from "express";

import { tradeRequestRoutes } from "./routes/tradeRequestRoutes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/trade-requests", tradeRequestRoutes);
app.use("/api/trade-requests", tradeRequestRoutes);
