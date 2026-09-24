import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as ctrl from "./guests.controller.js";

const router = Router();

// Public invitation card link (for guests opening the digital invitation)
router.get("/card/:eventId", ctrl.getPublicInvitation);

router.use(authenticate);

router.get("/event/:eventId", ctrl.listGuests);
router.post("/event/:eventId", ctrl.addGuest);
router.post("/event/:eventId/bulk", ctrl.bulkAddGuests);
router.patch("/:id", ctrl.updateGuest);
router.delete("/:id", ctrl.deleteGuest);
router.post("/:id/invite", ctrl.recordInvitationSent);

export default router;
