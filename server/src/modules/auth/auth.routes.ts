import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as authController from "./auth.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public
router.post("/register", authLimiter, authController.register);
router.post("/register-provider", authLimiter, authController.registerProvider);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authLimiter, authController.refresh);

// Authenticated
router.post("/logout", authenticate, authController.logout);

// Admin only
router.post(
  "/admin/create-user",
  authenticate,
  requireRole("ADMIN"),
  authController.adminCreateUser
);

export default router;
