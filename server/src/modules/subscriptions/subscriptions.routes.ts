import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as ctrl from "./subscriptions.controller.js";

const router = Router();

// Public routes
router.get("/plans", ctrl.listPlans);
router.get("/checkout", ctrl.getCheckoutPage);

router.use(authenticate);

// Subscription user endpoints — only CUSTOMER and PROVIDER can use subscriptions
router.get("/me", requireRole("CUSTOMER", "PROVIDER"), ctrl.getMySubscription);
router.post("/create-order", requireRole("CUSTOMER", "PROVIDER"), ctrl.createOrder);
router.post("/verify-payment", requireRole("CUSTOMER", "PROVIDER"), ctrl.verifyPayment);
router.post("/cancel", requireRole("CUSTOMER", "PROVIDER"), ctrl.cancelSubscription);

// Admin route
router.get("/admin/all", requireRole("ADMIN"), ctrl.adminListSubscriptions);

export default router;
