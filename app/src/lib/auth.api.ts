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
};

export const adminApi = {
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
};
