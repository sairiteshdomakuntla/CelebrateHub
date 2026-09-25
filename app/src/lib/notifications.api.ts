import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "LEAD"
  | "BOOKING"
  | "EVENT"
  | "SUBSCRIPTION"
  | "REVIEW"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Icon/colour metadata per notification type ───────────────────────────────

export const NOTIF_META: Record<
  NotificationType,
  { icon: string; color: string; bg: string }
> = {
  LEAD:         { icon: "inbox",       color: "#2F54B8", bg: "#EAF0FB" },
  BOOKING:      { icon: "calendar",    color: "#1E7A3C", bg: "#EAF6EE" },
  EVENT:        { icon: "star",        color: "#8A5E10", bg: "#FDF3E3" },
  SUBSCRIPTION: { icon: "shield",      color: "#9A3B26", bg: "#F9EFE9" },
  REVIEW:       { icon: "message-circle", color: "#6B4FA0", bg: "#F1EBF9" },
  SYSTEM:       { icon: "bell",        color: "#6E6E73", bg: "#F1EFEC" },
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  /** Full paginated inbox */
  list: async (params?: {
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<NotificationListResponse> => {
    const { data } = await api.get("/api/notifications", { params });
    return data.data;
  },

  /** Lightweight badge count only */
  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get("/api/notifications/unread-count");
    return data.data.count as number;
  },

  /** Mark a single notification as read */
  markAsRead: async (id: string): Promise<AppNotification> => {
    const { data } = await api.patch(`/api/notifications/${id}/read`);
    return data.data;
  },

  /** Mark every unread notification as read */
  markAllAsRead: async (): Promise<{ updated: number }> => {
    const { data } = await api.patch("/api/notifications/read-all");
    return data.data;
  },

  /** Delete a single notification */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/notifications/${id}`);
  },

  /** Delete all already-read notifications */
  clearRead: async (): Promise<{ deleted: number }> => {
    const { data } = await api.delete("/api/notifications/clear-read");
    return data.data;
  },
};
