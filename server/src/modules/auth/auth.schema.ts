import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
  password: passwordSchema,
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
  password: passwordSchema,
  role: z.enum(["CUSTOMER", "PROVIDER", "ADMIN"]),
  // Provider-specific fields (required when role = PROVIDER)
  businessName: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  serviceArea: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
}).refine(
  (data) => data.role !== "PROVIDER" || !!data.businessName,
  { message: "Business name is required for providers", path: ["businessName"] }
);

export const RegisterProviderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
  password: passwordSchema,
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(200),
  description: z.string().max(1000).optional(),
  serviceArea: z.string().min(2, "Service coverage area is required").max(100),
  pricingMin: z.number().int().nonnegative().optional(),
  pricingMax: z.number().int().nonnegative().optional(),
  categoryIds: z.array(z.string()).optional(),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type RegisterProviderDto = z.infer<typeof RegisterProviderSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
