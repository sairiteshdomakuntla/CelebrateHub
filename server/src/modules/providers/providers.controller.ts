import { Request, Response } from "express";
import { z } from "zod";
import {
  UpdateProviderSchema,
  SetCategoriesSchema,
  SetAvailabilitySchema,
} from "./providers.schema.js";
import * as svc from "./providers.service.js";

function handleError(res: Response, err: unknown) {
  const e = err as any;
  const status = e?.statusCode ?? 500;
  res.status(status).json({ success: false, message: e?.message ?? "Internal server error" });
}

// GET /api/providers/me
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const profile = await svc.getMyProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err) { handleError(res, err); }
}

// PATCH /api/providers/me
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const dto = UpdateProviderSchema.parse(req.body);
    const profile = await svc.updateMyProfile(req.user!.userId, dto);
    res.json({ success: true, data: profile });
  } catch (err) { handleError(res, err); }
}

// PUT /api/providers/me/categories
export async function setCategories(req: Request, res: Response): Promise<void> {
  try {
    const dto = SetCategoriesSchema.parse(req.body);
    const profile = await svc.setCategories(req.user!.userId, dto);
    res.json({ success: true, data: profile });
  } catch (err) { handleError(res, err); }
}

// PUT /api/providers/me/availability
export async function setAvailability(req: Request, res: Response): Promise<void> {
  try {
    const dto = SetAvailabilitySchema.parse(req.body);
    const profile = await svc.setAvailability(req.user!.userId, dto);
    res.json({ success: true, data: profile });
  } catch (err) { handleError(res, err); }
}

// GET /api/providers/:id  (public — customers browse)
export async function getProviderById(req: Request, res: Response): Promise<void> {
  try {
    const provider = await svc.getProviderById(req.params.id as string);
    res.json({ success: true, data: provider });
  } catch (err) { handleError(res, err); }
}

// GET /api/providers  (admin)
export async function listProviders(req: Request, res: Response): Promise<void> {
  try {
    const page               = parseInt(req.query.page as string) || 1;
    const verificationStatus = req.query.verificationStatus as string | undefined;
    const search             = (req.query.search as string | undefined)?.trim();
    const result = await svc.listProviders({ search, verificationStatus, page });
    res.json({ success: true, data: result });
  } catch (err) { handleError(res, err); }
}

// PATCH /api/providers/:id/verification  (admin)
export async function updateVerification(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      status: z.enum(["VERIFIED", "REJECTED", "PENDING", "SUSPENDED"]),
      notes:  z.string().optional(),
    });
    const { status, notes } = schema.parse(req.body);
    const provider = await svc.updateVerificationStatus(req.params.id as string, status, notes);
    res.json({ success: true, data: provider });
  } catch (err) { handleError(res, err); }
}
