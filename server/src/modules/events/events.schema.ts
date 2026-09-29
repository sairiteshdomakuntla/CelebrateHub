import { z } from "zod";

export const EventTypeEnum = z.enum([
  "WEDDING",
  "ENGAGEMENT",
  "BIRTHDAY",
  "BABY_SHOWER",
  "ANNIVERSARY",
  "HOUSEWARMING",
  "FESTIVAL",
  "CORPORATE",
  "OTHER",
]);

export const EventStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const CreateEventSchema = z.object({
  type: EventTypeEnum,
  title: z.string().trim().max(200).optional(),
  eventDate: z.string().datetime({ message: "eventDate must be ISO 8601" }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().default("Asia/Kolkata"),
  location: z.string().trim().min(1, "Location is required").max(500),
  latitude: z.union([z.coerce.number().min(-90).max(90), z.null()]).optional(),
  longitude: z.union([z.coerce.number().min(-180).max(180), z.null()]).optional(),
  guestCount: z.coerce.number().int().positive().optional(),
  budgetMin: z.coerce.number().int().nonnegative().optional(),
  budgetMax: z.coerce.number().int().nonnegative().optional(),
  requirements: z.string().trim().max(2000).optional(),
  // optional list of service category IDs to attach right away
  serviceCategories: z.array(z.string().uuid()).optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: EventStatusEnum.optional(),
});

export const AddServiceSchema = z.object({
  categoryId: z.string().uuid("categoryId must be a valid UUID"),
  requirements: z.string().trim().max(2000).optional(),
});

export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
export type AddServiceDto = z.infer<typeof AddServiceSchema>;
