import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as ctrl from "./providers.controller.js";

const router = Router();

router.use(authenticate);

// ─── Provider: own profile ────────────────────────────────────────────────────
router.get("/me",                  requireRole("PROVIDER"), ctrl.getMyProfile);
router.patch("/me",                requireRole("PROVIDER"), ctrl.updateMyProfile);
router.put("/me/categories",       requireRole("PROVIDER"), ctrl.setCategories);
router.put("/me/availability",     requireRole("PROVIDER"), ctrl.setAvailability);

// ─── Admin: list & verify providers ──────────────────────────────────────────
router.get("/",                    requireRole("ADMIN"),    ctrl.listProviders);
router.patch("/:id/verification",  requireRole("ADMIN"),    ctrl.updateVerification);

// ─── Public (authenticated): browse provider profile ─────────────────────────
router.get("/:id",                                          ctrl.getProviderById);

export default router;
