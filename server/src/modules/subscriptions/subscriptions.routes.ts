import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as ctrl from "./subscriptions.controller.js";

const router = Router();

// Public routes
router.get("/plans", ctrl.listPlans);
router.get("/checkout", ctrl.getCheckoutPage);

router.use(authenticate);

router.get("/me", ctrl.getMySubscription);
router.post("/create-order", ctrl.createOrder);
router.post("/verify-payment", ctrl.verifyPayment);
router.post("/cancel", ctrl.cancelSubscription);

// Admin route
router.get("/admin/all", requireRole("ADMIN"), ctrl.adminListSubscriptions);

export default router;
