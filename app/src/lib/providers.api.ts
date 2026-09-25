import api from "./api";
import type { ServiceCategory } from "./events.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface ProviderAvailabilitySlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ProviderImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  pricingMin: number | null;
  pricingMax: number | null;
  currency: string;
  serviceArea: string | null;
  serviceRadiusKm: number | null;
  latitude: string | null;
  longitude: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  verifiedAt: string | null;
  ratingAvg: string;
  ratingCount: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  categories: Array<{ id: string; categoryId: string; category: ServiceCategory }>;
  images: ProviderImage[];
  availability: ProviderAvailabilitySlot[];
}

export interface UpdateProviderPayload {
  businessName?: string;
  description?: string | null;
  pricingMin?: number | null;
  pricingMax?: number | null;
  serviceArea?: string | null;
  serviceRadiusKm?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isAvailable?: boolean;
}

export interface SetCategoriesPayload {
  categoryIds: string[];
}

export interface AvailabilitySlotPayload {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "MONDAY",    label: "Monday",    short: "Mon" },
  { key: "TUESDAY",   label: "Tuesday",   short: "Tue" },
  { key: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { key: "THURSDAY",  label: "Thursday",  short: "Thu" },
  { key: "FRIDAY",    label: "Friday",    short: "Fri" },
  { key: "SATURDAY",  label: "Saturday",  short: "Sat" },
  { key: "SUNDAY",    label: "Sunday",    short: "Sun" },
];

export const VERIFICATION_META: Record<VerificationStatus, { label: string; bg: string; text: string }> = {
  PENDING:   { label: "Pending",   bg: "#FDF3E3", text: "#8A5E10" },
  VERIFIED:  { label: "Verified",  bg: "#EAF6EE", text: "#1E7A3C" },
  REJECTED:  { label: "Rejected",  bg: "#FBECEB", text: "#B3261E" },
  SUSPENDED: { label: "Suspended", bg: "#F1EFEC", text: "#6E6E73" },
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const providersApi = {
  getMe: async (): Promise<ProviderProfile> => {
    const { data } = await api.get("/api/providers/me");
    return data.data;
  },

  update: async (payload: UpdateProviderPayload): Promise<ProviderProfile> => {
    const { data } = await api.patch("/api/providers/me", payload);
    return data.data;
  },

  setCategories: async (categoryIds: string[]): Promise<ProviderProfile> => {
    const { data } = await api.put("/api/providers/me/categories", { categoryIds });
    return data.data;
  },

  setAvailability: async (slots: AvailabilitySlotPayload[]): Promise<ProviderProfile> => {
    const { data } = await api.put("/api/providers/me/availability", { slots });
    return data.data;
  },

  getById: async (id: string): Promise<ProviderProfile> => {
    const { data } = await api.get(`/api/providers/${id}`);
    return data.data;
  },

  // Admin
  listAll: async (params?: {
    search?: string;
    verificationStatus?: string;
    page?: number;
  }) => {
    const { data } = await api.get("/api/providers", { params });
    return data.data as {
      providers: ProviderProfile[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    };
  },

  updateVerification: async (
    id: string,
    status: VerificationStatus,
    notes?: string
  ): Promise<ProviderProfile> => {
    const { data } = await api.patch(`/api/providers/${id}/verification`, { status, notes });
    return data.data;
  },
};
