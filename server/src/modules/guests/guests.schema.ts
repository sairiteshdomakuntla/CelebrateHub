import { z } from "zod";

export const AddGuestSchema = z.object({
  name: z.string().trim().min(1, "Guest name is required").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("Invalid email address").optional().nullable(),
});

export const BulkAddGuestsSchema = z.object({
  guests: z.array(AddGuestSchema).min(1, "At least one guest is required"),
});

export const UpdateGuestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  invitationStatus: z.enum(["PENDING", "SENT", "DELIVERED", "FAILED"]).optional(),
  invitationChannel: z.enum(["WHATSAPP", "SMS", "EMAIL"]).optional().nullable(),
});

export const SendInvitationSchema = z.object({
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
});

export type AddGuestDto = z.infer<typeof AddGuestSchema>;
export type BulkAddGuestsDto = z.infer<typeof BulkAddGuestsSchema>;
export type UpdateGuestDto = z.infer<typeof UpdateGuestSchema>;
export type SendInvitationDto = z.infer<typeof SendInvitationSchema>;
