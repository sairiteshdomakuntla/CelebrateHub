import api from "./api";

export type InvitationChannel = "WHATSAPP" | "SMS" | "EMAIL";
export type InvitationStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  phone: string | null;
  email: string | null;
  invitationChannel: InvitationChannel | null;
  invitationStatus: InvitationStatus;
  invitedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface GuestListResponse {
  guests: Guest[];
  stats: {
    total: number;
    sent: number;
    delivered: number;
    pending: number;
  };
  eventTitle: string | null;
  eventType: string;
}

export interface PublicInvitationCard {
  eventId: string;
  title: string | null;
  type: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string;
  requirements: string | null;
  hostName: string;
}

export const guestsApi = {
  list: async (eventId: string): Promise<GuestListResponse> => {
    const res = await api.get<GuestListResponse>(`/api/guests/event/${eventId}`);
    return res.data;
  },

  add: async (
    eventId: string,
    data: { name: string; phone?: string; email?: string }
  ): Promise<Guest> => {
    const res = await api.post<{ guest: Guest }>(`/api/guests/event/${eventId}`, data);
    return res.data.guest;
  },

  bulkAdd: async (
    eventId: string,
    guests: { name: string; phone?: string; email?: string }[]
  ): Promise<Guest[]> => {
    const res = await api.post<{ guests: Guest[] }>(`/api/guests/event/${eventId}/bulk`, { guests });
    return res.data.guests;
  },

  update: async (
    id: string,
    data: Partial<Pick<Guest, "name" | "phone" | "email" | "invitationStatus" | "invitationChannel">>
  ): Promise<Guest> => {
    const res = await api.patch<{ guest: Guest }>(`/api/guests/${id}`, data);
    return res.data.guest;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/guests/${id}`);
  },

  recordInvite: async (id: string, channel: InvitationChannel): Promise<Guest> => {
    const res = await api.post<{ guest: Guest }>(`/api/guests/${id}/invite`, { channel });
    return res.data.guest;
  },

  getCard: async (eventId: string): Promise<PublicInvitationCard> => {
    const res = await api.get<{ card: PublicInvitationCard }>(`/api/guests/card/${eventId}`);
    return res.data.card;
  },
};

// ─── Invitation message formatters ────────────────────────────────────────────

export function generateInvitationMessage(
  event: { title?: string | null; type: string; eventDate: string; startTime?: string | null; location: string },
  hostName?: string,
  guestName?: string
) {
  const formattedDate = new Date(event.eventDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeStr = event.startTime ? ` at ${event.startTime}` : "";
  const title = event.title || `${event.type} Celebration`;
  const greeting = guestName ? `Dear ${guestName},\n\n` : "";
  const host = hostName ? `Warm regards,\n${hostName}` : "We look forward to seeing you!";

  return `${greeting}✨ You are cordially invited to celebrate with us! ✨\n\n🎉 Event: ${title}\n📅 Date: ${formattedDate}${timeStr}\n📍 Venue: ${event.location}\n\nKindly confirm your presence.\n\n${host}\n\n— Sent via CelebrateHub`;
}
