import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  RegisterSchema,
  RegisterProviderSchema,
  LoginSchema,
  RefreshTokenSchema,
  CreateUserSchema,
} from "./auth.schema.js";
import * as authService from "./auth.service.js";

function getMeta(req: Request) {
  return {
    ipAddress: (req.ip ?? req.socket?.remoteAddress) as string | undefined,
    userAgent: req.headers["user-agent"] as string | undefined,
  };
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const dto = RegisterSchema.parse(req.body);
    const result = await authService.register(dto, getMeta(req));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/auth/register-provider
export async function registerProvider(req: Request, res: Response): Promise<void> {
  try {
    const dto = RegisterProviderSchema.parse(req.body);
    const result = await authService.registerProvider(dto, getMeta(req));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await authService.login(dto, getMeta(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(refreshToken, getMeta(req));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    handleError(err, res);
  }
}

// POST /api/auth/admin/create-user
export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  try {
    const dto = CreateUserSchema.parse(req.body);
    const result = await authService.adminCreateUser(dto);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    handleError(err, res);
  }
}

// ─── Error Handler ────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }
  res.status(500).json({ success: false, message: "Internal server error" });
}
