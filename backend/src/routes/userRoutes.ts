import { Router } from "express";

import { getUser, listUsers, postUser } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.get("/", listUsers);
userRoutes.get("/:id", getUser);
userRoutes.post("/", postUser);
