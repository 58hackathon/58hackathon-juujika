import { Router } from "express";

import {
  getCurrentUser,
  getUser,
  listUsers,
  postUser,
} from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.get("/", listUsers);
userRoutes.get("/me", getCurrentUser);
userRoutes.get("/:id", getUser);
userRoutes.post("/", postUser);
