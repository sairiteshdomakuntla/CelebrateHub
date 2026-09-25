import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import * as ctrl from "./notifications.controller";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// GET  /api/notifications                — paginated inbox
router.get("/",                  ctrl.listNotifications);

// GET  /api/notifications/unread-count   — lightweight badge count
router.get("/unread-count",      ctrl.getUnreadCount);

// PATCH /api/notifications/read-all     — mark every unread as read
router.patch("/read-all",        ctrl.markAllAsRead);

// DELETE /api/notifications/clear-read  — prune read messages
router.delete("/clear-read",     ctrl.clearReadNotifications);

// PATCH /api/notifications/:id/read     — mark single as read
router.patch("/:id/read",        ctrl.markAsRead);

// DELETE /api/notifications/:id         — delete single
router.delete("/:id",            ctrl.deleteNotification);

export default router;
