import { z } from "zod";

export const createGiftItemSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.string().default("GENERAL"),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  externalUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  targetAmount: z.number().int().positive("Target amount must be greater than 0").optional().nullable(),
  isGroupGift: z.boolean().default(false),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
});

export const updateGiftItemSchema = createGiftItemSchema.partial().extend({
  status: z.enum(["AVAILABLE", "CLAIMED", "COMPLETED"]).optional(),
});

export const claimGiftItemSchema = z.object({
  claimedBy: z.string().min(2, "Please enter your name").max(80),
});

export const createContributionSchema = z.object({
  giftItemId: z.string().uuid().optional().nullable(),
  contributorName: z.string().min(2, "Please enter your name").max(80),
  contributorEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  contributorPhone: z.string().min(8, "Invalid phone").max(15).optional().nullable().or(z.literal("")),
  amount: z.number().int().positive("Contribution amount must be at least ₹10"),
  message: z.string().max(300, "Message cannot exceed 300 characters").optional().nullable(),
  isAnonymous: z.boolean().default(false),
});

export const thankContributionSchema = z.object({
  thanked: z.boolean().default(true),
});

export type CreateGiftItemInput = z.infer<typeof createGiftItemSchema>;
export type UpdateGiftItemInput = z.infer<typeof updateGiftItemSchema>;
export type ClaimGiftItemInput = z.infer<typeof claimGiftItemSchema>;
export type CreateContributionInput = z.infer<typeof createContributionSchema>;
