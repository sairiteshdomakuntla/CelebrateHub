import api from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  provider?: {
    id: string;
    businessName: string;
    description?: string | null;
    serviceArea?: string | null;
    verificationStatus: string;
    ratingAvg: number;
    ratingCount: number;
    isAvailable: boolean;
  } | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterProviderPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  businessName: string;
  description?: string;
  serviceArea: string;
  pricingMin?: number;
  pricingMax?: number;
  categoryIds?: string[];
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  businessName?: string;
  description?: string;
  serviceArea?: string;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  provider?: { businessName: string; verificationStatus: string } | null;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post("/api/auth/register", payload);
    return data.data;
  },

  registerProvider: async (payload: RegisterProviderPayload): Promise<AuthResponse> => {
    const { data } = await api.post("/api/auth/register-provider", payload);
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post("/api/auth/login", payload);
    return data.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post("/api/auth/logout", { refreshToken });
  },

  createUser: async (payload: CreateUserPayload): Promise<{ user: AuthUser }> => {
    const { data } = await api.post("/api/auth/admin/create-user", payload);
    return data.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get("/api/users/me");
    return data.data;
  },

  updateMe: async (payload: { name?: string; email?: string; phone?: string | null }): Promise<AuthUser> => {
    const { data } = await api.patch("/api/users/me", payload);
    return data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch("/api/users/me/password", { currentPassword, newPassword });
  },
};

export interface AdminCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    providers: number;
    eventServices: number;
  };
}

export interface EventTypeCatalogItem {
  type: string;
  label: string;
  icon: string;
  color: string;
}

export interface AdminCategoriesResponse {
  categories: AdminCategoryItem[];
  eventTypes: EventTypeCatalogItem[];
}

export const adminApi = {
  getStats: async (): Promise<AdminDashboardStats> => {
    const { data } = await api.get("/api/admin/stats");
    return data.data;
  },

  getAnalytics: async (): Promise<AdminAnalyticsResponse> => {
    const { data } = await api.get("/api/admin/analytics");
    return data.data;
  },

  getSettings: async (): Promise<PlatformSettingItem[]> => {
    const { data } = await api.get("/api/admin/settings");
    return data.data;
  },

  updateSetting: async (key: string, value: string): Promise<PlatformSettingItem> => {
    const { data } = await api.patch(`/api/admin/settings/${key}`, { value });
    return data.data;
  },

  listUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
  }): Promise<AdminUsersResponse> => {
    const { data } = await api.get("/api/admin/users", { params });
    return data.data;
  },

  updateStatus: async (
    id: string,
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ): Promise<AdminUserListItem> => {
    const { data } = await api.patch(`/api/admin/users/${id}/status`, { status });
    return data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/users/${id}`);
  },

  listCategories: async (): Promise<AdminCategoriesResponse> => {
    const { data } = await api.get("/api/admin/categories");
    return data.data;
  },

  createCategory: async (payload: {
    name: string;
    slug?: string;
    icon?: string;
    isActive?: boolean;
  }): Promise<AdminCategoryItem> => {
    const { data } = await api.post("/api/admin/categories", payload);
    return data.data;
  },

  updateCategory: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      icon?: string | null;
      isActive?: boolean;
    }
  ): Promise<AdminCategoryItem> => {
    const { data } = await api.patch(`/api/admin/categories/${id}`, payload);
    return data.data;
  },

  deleteCategory: async (id: string): Promise<{ success: boolean; message: string; deactivated?: boolean }> => {
    const { data } = await api.delete(`/api/admin/categories/${id}`);
    return data;
  },

  listPlans: async (): Promise<AdminPlansResponse> => {
    const { data } = await api.get("/api/admin/plans");
    return data.data;
  },

  createPlan: async (payload: {
    name: string;
    slug?: string;
    description?: string;
    price: number;
    currency?: string;
    interval: "MONTHLY" | "YEARLY";
    isActive?: boolean;
    targetRole?: "PROVIDER" | "CUSTOMER";
  }): Promise<AdminPlanItem> => {
    const { data } = await api.post("/api/admin/plans", payload);
    return data.data;
  },

  updatePlan: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      description?: string | null;
      price?: number;
      currency?: string;
      interval?: "MONTHLY" | "YEARLY";
      isActive?: boolean;
    }
  ): Promise<AdminPlanItem> => {
    const { data } = await api.patch(`/api/admin/plans/${id}`, payload);
    return data.data;
  },

  deletePlan: async (id: string): Promise<{ success: boolean; message: string; deactivated?: boolean }> => {
    const { data } = await api.delete(`/api/admin/plans/${id}`);
    return data;
  },

  listReviews: async (params?: {
    status?: string;
    rating?: number;
    search?: string;
  }): Promise<AdminReviewsResponse> => {
    const { data } = await api.get("/api/admin/reviews", { params });
    return data.data;
  },

  updateReviewStatus: async (
    id: string,
    payload: {
      status: "APPROVED" | "FLAGGED" | "HIDDEN";
      flagReason?: string | null;
      moderationNotes?: string | null;
    }
  ): Promise<AdminReviewItem> => {
    const { data } = await api.patch(`/api/admin/reviews/${id}/status`, payload);
    return data.data;
  },

  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/reviews/${id}`);
  },

  listIssues: async (params?: {
    status?: string;
    priority?: string;
    category?: string;
  }): Promise<AdminIssuesResponse> => {
    const { data } = await api.get("/api/admin/issues", { params });
    return data.data;
  },

  createIssue: async (payload: {
    userId?: string;
    title: string;
    description: string;
    category?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }): Promise<AdminIssueItem> => {
    const { data } = await api.post("/api/admin/issues", payload);
    return data.data;
  },

  updateIssue: async (
    id: string,
    payload: {
      status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      resolutionNotes?: string | null;
    }
  ): Promise<AdminIssueItem> => {
    const { data } = await api.patch(`/api/admin/issues/${id}`, payload);
    return data.data;
  },

  deleteIssue: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/issues/${id}`);
  },
};

export interface AdminPlanItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: "MONTHLY" | "YEARLY";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeSubscribers: number;
  targetRole: "PROVIDER" | "CUSTOMER";
  _count: {
    subscriptions: number;
  };
}

export interface AdminPlansResponse {
  plans: AdminPlanItem[];
  stats: {
    totalPlans: number;
    activePlans: number;
    totalSubscribers: number;
    estimatedMRR: number;
  };
}

export interface AdminReviewItem {
  id: string;
  bookingId: string;
  authorId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  status: "APPROVED" | "FLAGGED" | "HIDDEN";
  isFlagged: boolean;
  flagReason: string | null;
  moderatedAt: string | null;
  moderationNotes: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string | null;
  };
  provider: {
    id: string;
    businessName: string;
    user: {
      name: string;
    };
  };
  booking?: {
    id: string;
    status: string;
    agreedPrice: number | null;
  } | null;
}

export interface AdminReviewsResponse {
  reviews: AdminReviewItem[];
  stats: {
    totalReviews: number;
    flaggedCount: number;
    hiddenCount: number;
    avgRating: number;
  };
}

export interface AdminIssueItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
  };
}

export interface AdminIssuesResponse {
  issues: AdminIssueItem[];
  stats: {
    total: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  providersCount: number;
  customersCount: number;
  adminsCount: number;
  totalEvents: number;
  activeEvents: number;
  totalLeads: number;
  acceptedLeads: number;
  leadConversionRate: number;
  totalBookings: number;
  completedBookings: number;
  activeSubscriptions: number;
  pendingVerifications: number;
  flaggedReviews: number;
  openIssues: number;
  grossMerchandiseValue: number;
  totalCommissions: number;
  mrr: number;
}

export interface PlatformSettingItem {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnalyticsResponse {
  funnel: {
    totalDispatched: number;
    viewedCount: number;
    acceptedCount: number;
  };
  categoryStats: {
    name: string;
    slug: string;
    leadsCount: number;
    providersCount: number;
  }[];
  recentBookings: {
    id: string;
    customerName: string;
    providerName: string;
    agreedPrice: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
  }[];
  recentIssues: {
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    userName: string;
    createdAt: string;
  }[];
}

