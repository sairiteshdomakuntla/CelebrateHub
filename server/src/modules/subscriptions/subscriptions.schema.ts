import { z } from "zod";

export const CreateOrderSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
});

export const VerifyPaymentSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required"),
});

export const CancelSubscriptionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionSchema>;
