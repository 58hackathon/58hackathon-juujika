import { Router } from "express";

import {
  listFavorites,
  postFavorite,
  removeFavorite,
} from "../controllers/favoriteController.js";

export const favoriteRoutes = Router();

favoriteRoutes.get("/", listFavorites);
favoriteRoutes.post("/", postFavorite);
favoriteRoutes.delete("/:itemId", removeFavorite);
