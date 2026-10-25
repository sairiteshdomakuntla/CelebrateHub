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
  LEAD:         { icon: "inbox",          color: "#8FB4FF", bg: "#1B2A55" },
  BOOKING:      { icon: "calendar",       color: "#6EE7B7", bg: "#123B34" },
  EVENT:        { icon: "sparkles",       color: "#FFC53D", bg: "#3D2F0F" },
  SUBSCRIPTION: { icon: "shield",         color: "#7C5CFF", bg: "#2A2460" },
  REVIEW:       { icon: "message-circle", color: "#FF8FA3", bg: "#3F1420" },
  SYSTEM:       { icon: "bell",           color: "#B8B3E0", bg: "#1E1A3F" },
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
