import { z } from "zod";

export const LeadTabSchema = z.enum(["available", "accepted", "history"]).default("available");

export const AcceptLeadSchema = z.object({
  agreedPrice: z.number().int().nonnegative().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const DeclineLeadSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type AcceptLeadDto = z.infer<typeof AcceptLeadSchema>;
export type DeclineLeadDto = z.infer<typeof DeclineLeadSchema>;
