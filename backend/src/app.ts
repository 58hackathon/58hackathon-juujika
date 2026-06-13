import cors from "cors";
import express from "express";

import { favoriteRoutes } from "./routes/favoriteRoutes.js";
import { itemRoutes } from "./routes/itemRoutes.js";
import { tradeRequestRoutes } from "./routes/tradeRequestRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/trade-requests", tradeRequestRoutes);
app.use("/api/trade-requests", tradeRequestRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/users", userRoutes);
app.use("/api/users", userRoutes);
app.use("/items", itemRoutes);
app.use("/api/items", itemRoutes);
