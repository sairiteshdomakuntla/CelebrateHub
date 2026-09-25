import { Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/auth.middleware.js";
import * as ctrl from "./gifts.controller.js";

const router = Router();

// ─── Public / Guest Accessible (with optional auth for host recognition) ──────
router.get("/event/:eventId", optionalAuth, ctrl.getGiftCircle);
router.post("/items/:id/claim", optionalAuth, ctrl.claimGiftItem);
router.post("/items/:id/unclaim", optionalAuth, ctrl.unclaimGiftItem);
router.post("/event/:eventId/contribute", optionalAuth, ctrl.createContribution);

// ─── Host / Authenticated Only ───────────────────────────────────────────────
router.post("/event/:eventId/items", authenticate, ctrl.addGiftItem);
router.patch("/items/:id", authenticate, ctrl.updateGiftItem);
router.delete("/items/:id", authenticate, ctrl.deleteGiftItem);
router.post("/contributions/:id/thank", authenticate, ctrl.thankContribution);

export default router;
