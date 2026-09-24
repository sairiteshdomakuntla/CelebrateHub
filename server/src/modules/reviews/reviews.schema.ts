import { z } from "zod";

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z.string().max(1000, "Review comment cannot exceed 1000 characters").optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5").optional(),
  comment: z.string().max(1000, "Review comment cannot exceed 1000 characters").optional(),
});

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
