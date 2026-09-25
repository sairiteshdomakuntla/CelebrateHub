import { Request, Response } from "express";
import * as svc from "./notifications.service";

function handleError(res: Response, err: any) {
  const status = err?.statusCode ?? (err?.name === "ZodError" ? 400 : 500);
  const message = err?.message ?? "Internal server error";
  res.status(status).json({ success: false, message });
}

// GET /api/notifications
export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await svc.listNotifications(req.user!.userId, { unreadOnly, page, pageSize });
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const count = await svc.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    handleError(res, err);
  }
}

// PATCH /api/notifications/:id/read
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await svc.markAsRead(req.user!.userId, req.params.id as string);
    res.json({ success: true, data: notification });
  } catch (err) {
    handleError(res, err);
  }
}

// PATCH /api/notifications/read-all
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const result = await svc.markAllAsRead(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /api/notifications/:id
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const result = await svc.deleteNotification(req.user!.userId, req.params.id as string);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /api/notifications/clear-read
export async function clearReadNotifications(req: Request, res: Response): Promise<void> {
  try {
    const result = await svc.clearReadNotifications(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
}
