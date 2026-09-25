import api from "./api";

export type GiftPriority = "HIGH" | "MEDIUM" | "LOW";
export type GiftStatus = "AVAILABLE" | "CLAIMED" | "COMPLETED";

export interface GiftItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  externalUrl: string | null;
  targetAmount: number | null;
  collectedAmount: number;
  isGroupGift: boolean;
  priority: GiftPriority;
  status: GiftStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contributions: number;
  };
}

export interface GiftContribution {
  id: string;
  eventId: string;
  giftItemId: string | null;
  contributorName: string;
  contributorEmail: string | null;
  contributorPhone: string | null;
  amount: number;
  message: string | null;
  paymentStatus: string;
  isAnonymous: boolean;
  thanked: boolean;
  createdAt: string;
  giftItem?: {
    id: string;
    title: string;
    isGroupGift: boolean;
  } | null;
}

export interface GiftCircleStats {
  totalItems: number;
  claimedItems: number;
  availableItems: number;
  groupFundsCount: number;
  totalTargetAmount: number;
  totalCollectedAmount: number;
  percentageFunded: number;
  contributionsCount: number;
}

export interface GiftCircleResponse {
  event: {
    id: string;
    title: string | null;
    type: string;
    eventDate: string;
    location: string;
    customer: {
      id: string;
      name: string;
    };
  };
  isHost: boolean;
  stats: GiftCircleStats;
  items: GiftItem[];
  contributions: GiftContribution[];
}

export interface CreateGiftItemPayload {
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  externalUrl?: string;
  targetAmount?: number;
  isGroupGift?: boolean;
  priority?: GiftPriority;
}

export interface CreateContributionPayload {
  giftItemId?: string;
  contributorName: string;
  contributorEmail?: string;
  contributorPhone?: string;
  amount: number;
  message?: string;
  isAnonymous?: boolean;
}

export const GIFT_CATEGORIES = [
  { key: "ALL",         label: "All Gifts",           icon: "grid",       color: "#1C1C1E", bg: "#F1EFEC" },
  { key: "CASH_FUND",   label: "Cash Funds",          icon: "wallet",     color: "#1E7A3C", bg: "#EAF6EE" },
  { key: "HOME",        label: "Home & Decor",        icon: "home",       color: "#2F54B8", bg: "#EAF0FB" },
  { key: "KITCHEN",     label: "Kitchen & Dining",    icon: "coffee",     color: "#9C4221", bg: "#FBECE6" },
  { key: "GADGETS",     label: "Tech & Gadgets",      icon: "laptop",     color: "#7A35A5", bg: "#F3EBF9" },
  { key: "EXPERIENCE",  label: "Travel & Experience", icon: "compass",    color: "#8A5E10", bg: "#FDF3E3" },
  { key: "FASHION",     label: "Style & Jewels",      icon: "sparkles",   color: "#A22C5C", bg: "#FBEAF2" },
  { key: "BABY",        label: "Baby & Kids",         icon: "heart",      color: "#0D7A70", bg: "#E6F5F3" },
  { key: "GENERAL",     label: "Wishlist",            icon: "gift",       color: "#4F46E5", bg: "#EEF2FF" },
] as const;

export const giftsApi = {
  getCircle: async (eventId: string): Promise<GiftCircleResponse> => {
    const { data } = await api.get<{ success: boolean; data: GiftCircleResponse }>(
      `/api/gifts/event/${eventId}`
    );
    return data.data;
  },

  addItem: async (eventId: string, payload: CreateGiftItemPayload): Promise<GiftItem> => {
    const { data } = await api.post<{ success: boolean; data: GiftItem }>(
      `/api/gifts/event/${eventId}/items`,
      payload
    );
    return data.data;
  },

  updateItem: async (itemId: string, payload: Partial<CreateGiftItemPayload & { status: GiftStatus }>): Promise<GiftItem> => {
    const { data } = await api.patch<{ success: boolean; data: GiftItem }>(
      `/api/gifts/items/${itemId}`,
      payload
    );
    return data.data;
  },

  deleteItem: async (itemId: string): Promise<void> => {
    await api.delete(`/api/gifts/items/${itemId}`);
  },

  claimItem: async (itemId: string, claimedBy: string): Promise<GiftItem> => {
    const { data } = await api.post<{ success: boolean; data: GiftItem }>(
      `/api/gifts/items/${itemId}/claim`,
      { claimedBy }
    );
    return data.data;
  },

  unclaimItem: async (itemId: string): Promise<GiftItem> => {
    const { data } = await api.post<{ success: boolean; data: GiftItem }>(
      `/api/gifts/items/${itemId}/unclaim`
    );
    return data.data;
  },

  contribute: async (eventId: string, payload: CreateContributionPayload): Promise<GiftContribution> => {
    const { data } = await api.post<{ success: boolean; data: GiftContribution }>(
      `/api/gifts/event/${eventId}/contribute`,
      payload
    );
    return data.data;
  },

  thankContribution: async (contributionId: string): Promise<GiftContribution> => {
    const { data } = await api.post<{ success: boolean; data: GiftContribution }>(
      `/api/gifts/contributions/${contributionId}/thank`
    );
    return data.data;
  },
};
