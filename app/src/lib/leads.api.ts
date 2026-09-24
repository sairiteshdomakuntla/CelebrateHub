import api from "./api";
import type { ServiceCategory, EventType, EventStatus } from "./events.api";

export type LeadStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
export type LeadProviderStatus = "PENDING" | "VIEWED" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface LeadItem {
  leadProviderId: string;
  leadId: string;
  leadStatus: LeadStatus;
  myStatus: LeadProviderStatus;
  notifiedAt?: string | null;
  viewedAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  service: {
    id: string;
    category: ServiceCategory;
    requirements?: string | null;
  };
  event: {
    id: string;
    title?: string | null;
    type: EventType;
    eventDate: string;
    startTime?: string | null;
    endTime?: string | null;
    location: string;
    guestCount?: number | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    requirements?: string | null;
    status: EventStatus;
    customer: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
    };
  };
  booking?: {
    id: string;
    status: string;
    agreedPrice?: number | null;
    currency: string;
    confirmedAt?: string | null;
    customer?: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
    };
  } | null;
}

export interface LeadStats {
  availableCount: number;
  acceptedCount: number;
}

export interface CustomerEventServiceLead {
  serviceId: string;
  category: ServiceCategory;
  requirements?: string | null;
  leadStatus: LeadStatus;
  matchedProvidersCount: number;
  booking?: {
    id: string;
    status: string;
    agreedPrice?: number | null;
    confirmedAt?: string | null;
    provider: {
      id: string;
      businessName: string;
      serviceArea?: string | null;
      phone?: string | null;
      email?: string | null;
      ratingAvg?: number;
      ratingCount?: number;
    };
  } | null;
}

export const leadsApi = {
  getLeads: async (tab: "available" | "accepted" | "history" = "available"): Promise<LeadItem[]> => {
    const res = await api.get<{ leads: LeadItem[] }>(`/api/leads?tab=${tab}`);
    return res.data.leads;
  },

  getStats: async (): Promise<LeadStats> => {
    const res = await api.get<LeadStats>("/api/leads/stats");
    return res.data;
  },

  getLead: async (id: string): Promise<LeadItem> => {
    const res = await api.get<{ lead: LeadItem }>(`/api/leads/${id}`);
    return res.data.lead;
  },

  acceptLead: async (
    id: string,
    data?: { agreedPrice?: number; notes?: string }
  ): Promise<{ message: string; lead: any; booking: any }> => {
    const res = await api.post(`/api/leads/${id}/accept`, data ?? {});
    return res.data;
  },

  declineLead: async (id: string, data?: { reason?: string }): Promise<{ message: string }> => {
    const res = await api.post(`/api/leads/${id}/decline`, data ?? {});
    return res.data;
  },

  getEventLeads: async (eventId: string): Promise<CustomerEventServiceLead[]> => {
    const res = await api.get<{ services: CustomerEventServiceLead[] }>(`/api/leads/event/${eventId}`);
    return res.data.services;
  },
};
