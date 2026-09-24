import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import * as ctrl from "./events.controller.js";

const router = Router();

// All event routes require authentication
router.use(authenticate);

// Service categories (accessible to all authenticated users)
router.get("/categories", ctrl.listCategories);

// Customer event CRUD
router.get("/", ctrl.listEvents);
router.post("/", requireRole("CUSTOMER", "ADMIN"), ctrl.createEvent);
router.get("/:id", ctrl.getEvent);
router.patch("/:id", ctrl.updateEvent);
router.delete("/:id", ctrl.deleteEvent);

// Event services management
router.post("/:id/services", ctrl.addService);
router.delete("/:id/services/:categoryId", ctrl.removeService);

export default router;
