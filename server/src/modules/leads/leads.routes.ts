import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as ctrl from "./leads.controller.js";

const router = Router();

router.use(authenticate);

// ─── Provider Lead Routes ─────────────────────────────────────────────────────
router.get("/", requireRole("PROVIDER", "ADMIN"), ctrl.getProviderLeads);
router.get("/stats", requireRole("PROVIDER", "ADMIN"), ctrl.getProviderLeadStats);
router.get("/:id", requireRole("PROVIDER", "ADMIN"), ctrl.getLeadDetail);
router.post("/:id/accept", requireRole("PROVIDER", "ADMIN"), ctrl.acceptLead);
router.post("/:id/decline", requireRole("PROVIDER", "ADMIN"), ctrl.declineLead);

// ─── Customer Event Leads Route ───────────────────────────────────────────────
router.get("/event/:eventId", ctrl.getEventLeadsForCustomer);

// ─── Admin Lead Management ────────────────────────────────────────────────────
router.get("/admin/all", requireRole("ADMIN"), ctrl.adminListLeads);

export default router;
