import { Router } from "express";

import {
  getGachaItem,
  getItem,
  listItems,
  postItem,
} from "../controllers/itemController.js";

export const itemRoutes = Router();

itemRoutes.get("/", listItems);
itemRoutes.get("/gacha", getGachaItem);
itemRoutes.get("/:id", getItem);
itemRoutes.post("/", postItem);
