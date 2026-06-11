import { Router } from "express";

import { getItem, listItems, postItem } from "../controllers/itemController.js";

export const itemRoutes = Router();

itemRoutes.get("/", listItems);
itemRoutes.get("/:id", getItem);
itemRoutes.post("/", postItem);
