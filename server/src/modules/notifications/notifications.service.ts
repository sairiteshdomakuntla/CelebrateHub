import { prisma } from "../../lib/prisma.js";

export type NotificationType = "LEAD" | "BOOKING" | "EVENT" | "SUBSCRIPTION" | "REVIEW" | "SYSTEM";

// ─── List notifications for current user ─────────────────────────────────────

export async function listNotifications(
  userId: string,
  params: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, params.pageSize ?? 20);

  const where: any = { userId };
  if (params.unreadOnly) where.isRead = false;

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ─── Get unread badge count only (lightweight) ────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ─── Mark a single notification as read ──────────────────────────────────────

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw Object.assign(new Error("Notification not found"), { statusCode: 404 });
  }

  if (notification.userId !== userId) {
    throw Object.assign(new Error("Access denied"), { statusCode: 403 });
  }

  if (notification.isRead) return notification; // already read — no-op

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

// ─── Mark all notifications as read ──────────────────────────────────────────

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { updated: result.count };
}

// ─── Delete a notification ────────────────────────────────────────────────────

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw Object.assign(new Error("Notification not found"), { statusCode: 404 });
  }

  if (notification.userId !== userId) {
    throw Object.assign(new Error("Access denied"), { statusCode: 403 });
  }

  await prisma.notification.delete({ where: { id: notificationId } });
  return { message: "Notification deleted" };
}

// ─── Delete all read notifications (cleanup) ─────────────────────────────────

export async function clearReadNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return { deleted: result.count };
}
