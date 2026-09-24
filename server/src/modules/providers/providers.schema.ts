import { z } from "zod";

export const UpdateProviderSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  description:  z.string().trim().max(2000).optional().nullable(),
  pricingMin:   z.number().int().nonnegative().optional().nullable(),
  pricingMax:   z.number().int().nonnegative().optional().nullable(),
  serviceArea:  z.string().trim().max(500).optional().nullable(),
  latitude:     z.number().min(-90).max(90).optional().nullable(),
  longitude:    z.number().min(-180).max(180).optional().nullable(),
  isAvailable:  z.boolean().optional(),
});

export const SetCategoriesSchema = z.object({
  // Replace all categories with this list of category IDs
  categoryIds: z.array(z.string().uuid()).min(1, "Select at least one category"),
});

export const AvailabilitySlotSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
    "FRIDAY", "SATURDAY", "SUNDAY",
  ]),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  isAvailable: z.boolean().default(true),
});

export const SetAvailabilitySchema = z.object({
  // Replace entire weekly schedule with this list
  slots: z.array(AvailabilitySlotSchema),
});

export type UpdateProviderDto    = z.infer<typeof UpdateProviderSchema>;
export type SetCategoriesDto     = z.infer<typeof SetCategoriesSchema>;
export type SetAvailabilityDto   = z.infer<typeof SetAvailabilitySchema>;
