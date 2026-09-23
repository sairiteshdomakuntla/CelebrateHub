import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import { listUsers, updateUserStatus, deleteUser } from "./admin.controller.js";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
