import api from "./api";

export type SubscriptionInterval = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: SubscriptionInterval;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  paymentProvider: string | null;
  externalId: string | null;
  plan: SubscriptionPlan;
}

export interface RazorpayOrderResponse {
  free: boolean;
  message?: string;
  subscription?: Subscription;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  plan?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    interval: SubscriptionInterval;
  };
  user?: {
    name: string;
    email: string;
    phone: string | null;
  };
}

export const subscriptionsApi = {
  listPlans: async (role?: string): Promise<SubscriptionPlan[]> => {
    const res = await api.get<{ plans: SubscriptionPlan[] }>(
      role ? `/api/subscriptions/plans?role=${role}` : "/api/subscriptions/plans"
    );
    return res.data.plans;
  },

  getMySubscription: async (): Promise<Subscription | null> => {
    const res = await api.get<{ subscription: Subscription | null }>("/api/subscriptions/me");
    return res.data.subscription;
  },

  createOrder: async (planId: string): Promise<RazorpayOrderResponse> => {
    const res = await api.post<RazorpayOrderResponse>("/api/subscriptions/create-order", { planId });
    return res.data;
  },

  verifyPayment: async (data: {
    planId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ message: string; subscription: Subscription }> => {
    const res = await api.post("/api/subscriptions/verify-payment", data);
    return res.data;
  },

  cancelSubscription: async (): Promise<{ message: string; subscription: Subscription }> => {
    const res = await api.post("/api/subscriptions/cancel");
    return res.data;
  },
};
