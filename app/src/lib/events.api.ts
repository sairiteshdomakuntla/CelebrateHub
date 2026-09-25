import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "WEDDING" | "ENGAGEMENT" | "BIRTHDAY" | "BABY_SHOWER"
  | "ANNIVERSARY" | "HOUSEWARMING" | "FESTIVAL" | "CORPORATE" | "OTHER";

export type EventStatus = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface EventService {
  id: string;
  eventId: string;
  categoryId: string;
  requirements: string | null;
  category: ServiceCategory;
  lead?: {
    id: string;
    status: string;
    booking?: {
      id: string;
      status: string;
      agreedPrice?: number | null;
      confirmedAt?: string | null;
      provider: {
        id: string;
        businessName: string;
        serviceArea?: string | null;
        user: { name: string; phone?: string | null; email?: string | null };
      };
      review?: {
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
      } | null;
    } | null;
    providers?: { id: string; status: string }[];
  } | null;
}

export interface Event {
  id: string;
  customerId: string;
  type: EventType;
  title: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  guestCount: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  requirements: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  services: EventService[];
  _count: { guests: number };
}

export interface CreateEventPayload {
  type: EventType;
  title?: string;
  eventDate: string;        // ISO 8601
  startTime?: string;       // "HH:MM"
  endTime?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  guestCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  requirements?: string;
  serviceCategories?: string[];
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {
  status?: EventStatus;
}

// ─── EVENT TYPE META ──────────────────────────────────────────────────────────

export const EVENT_TYPE_META: Record<EventType, { label: string; emoji: string }> = {
  WEDDING:      { label: "Wedding",      emoji: "💍" },
  ENGAGEMENT:   { label: "Engagement",   emoji: "💑" },
  BIRTHDAY:     { label: "Birthday",     emoji: "🎂" },
  BABY_SHOWER:  { label: "Baby Shower",  emoji: "👶" },
  ANNIVERSARY:  { label: "Anniversary",  emoji: "🥂" },
  HOUSEWARMING: { label: "Housewarming", emoji: "🏠" },
  FESTIVAL:     { label: "Festival",     emoji: "🎉" },
  CORPORATE:    { label: "Corporate",    emoji: "💼" },
  OTHER:        { label: "Other",        emoji: "✨" },
};

export const EVENT_STATUS_META: Record<EventStatus, { label: string; bg: string; text: string }> = {
  DRAFT:       { label: "Draft",       bg: "#F1EFEC", text: "#6E6E73" },
  PUBLISHED:   { label: "Published",   bg: "#EAF0FB", text: "#2F54B8" },
  IN_PROGRESS: { label: "In Progress", bg: "#FDF3E3", text: "#8A5E10" },
  COMPLETED:   { label: "Completed",   bg: "#EAF6EE", text: "#1E7A3C" },
  CANCELLED:   { label: "Cancelled",   bg: "#FBECEB", text: "#B3261E" },
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const eventsApi = {
  listCategories: async (): Promise<ServiceCategory[]> => {
    const { data } = await api.get("/api/events/categories");
    return data.data;
  },

  list: async (): Promise<Event[]> => {
    const { data } = await api.get("/api/events");
    return data.data;
  },

  get: async (id: string): Promise<Event> => {
    const { data } = await api.get(`/api/events/${id}`);
    return data.data;
  },

  create: async (payload: CreateEventPayload): Promise<Event> => {
    const { data } = await api.post("/api/events", payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateEventPayload): Promise<Event> => {
    const { data } = await api.patch(`/api/events/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/events/${id}`);
  },

  addService: async (
    eventId: string,
    categoryId: string,
    requirements?: string
  ): Promise<EventService> => {
    const { data } = await api.post(`/api/events/${eventId}/services`, {
      categoryId,
      requirements,
    });
    return data.data;
  },

  removeService: async (eventId: string, categoryId: string): Promise<void> => {
    await api.delete(`/api/events/${eventId}/services/${categoryId}`);
  },
};
