import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getMe } from "./users.controller.js";

const router = Router();

router.get("/me", authenticate, getMe);

export default router;
