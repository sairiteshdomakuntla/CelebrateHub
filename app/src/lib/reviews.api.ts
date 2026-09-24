import api from "./api";

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
  provider?: {
    id: string;
    businessName: string;
  };
  booking?: {
    id: string;
    confirmedAt?: string;
    lead?: {
      eventService?: {
        category?: {
          id: string;
          name: string;
          icon?: string | null;
        };
        event?: {
          id: string;
          title?: string | null;
          type: string;
          eventDate: string;
        };
      };
    };
  };
}

export interface ProviderReviewsResponse {
  provider: {
    id: string;
    businessName: string;
    ratingAvg: number;
    ratingCount: number;
  };
  stats: {
    total: number;
    averageRating: number;
    breakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  reviews: Review[];
}

export const reviewsApi = {
  getProviderReviews: async (providerId: string): Promise<ProviderReviewsResponse> => {
    const res = await api.get<{ success: boolean; data: ProviderReviewsResponse }>(
      `/api/reviews/provider/${providerId}`
    );
    return res.data.data;
  },

  getBookingReview: async (bookingId: string): Promise<Review | null> => {
    const res = await api.get<{ success: boolean; data: Review | null }>(
      `/api/reviews/booking/${bookingId}`
    );
    return res.data.data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const res = await api.get<{ success: boolean; data: Review[] }>("/api/reviews/my");
    return res.data.data;
  },

  getReceivedReviews: async (): Promise<ProviderReviewsResponse> => {
    const res = await api.get<{ success: boolean; data: ProviderReviewsResponse }>(
      "/api/reviews/received"
    );
    return res.data.data;
  },

  createReview: async (data: { bookingId: string; rating: number; comment?: string }): Promise<Review> => {
    const res = await api.post<{ success: boolean; data: Review }>("/api/reviews", data);
    return res.data.data;
  },

  updateReview: async (id: string, data: { rating?: number; comment?: string }): Promise<Review> => {
    const res = await api.patch<{ success: boolean; data: Review }>(`/api/reviews/${id}`, data);
    return res.data.data;
  },

  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/api/reviews/${id}`);
  },
};
