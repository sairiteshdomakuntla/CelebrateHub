import { Request, Response } from "express";
import * as svc from "./guests.service.js";
import {
  AddGuestSchema,
  BulkAddGuestsSchema,
  UpdateGuestSchema,
  SendInvitationSchema,
} from "./guests.schema.js";

function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return userId;
}

export async function listGuests(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const eventId = String(req.params.eventId);
    const data = await svc.listGuests(eventId, callerId, callerRole);
    res.json(data);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to list guests" });
  }
}

export async function addGuest(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const eventId = String(req.params.eventId);
    const parsed = AddGuestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid guest data" });
      return;
    }
    const guest = await svc.addGuest(eventId, callerId, callerRole, parsed.data);
    res.status(201).json({ guest });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to add guest" });
  }
}

export async function bulkAddGuests(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const eventId = String(req.params.eventId);
    const parsed = BulkAddGuestsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid bulk guest data" });
      return;
    }
    const guests = await svc.bulkAddGuests(eventId, callerId, callerRole, parsed.data);
    res.status(201).json({ guests });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to bulk add guests" });
  }
}

export async function updateGuest(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const id = String(req.params.id);
    const parsed = UpdateGuestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid update data" });
      return;
    }
    const guest = await svc.updateGuest(id, callerId, callerRole, parsed.data);
    res.json({ guest });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to update guest" });
  }
}

export async function deleteGuest(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const id = String(req.params.id);
    await svc.deleteGuest(id, callerId, callerRole);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to delete guest" });
  }
}

export async function recordInvitationSent(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const id = String(req.params.id);
    const parsed = SendInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Valid channel is required" });
      return;
    }
    const guest = await svc.recordInvitationSent(id, callerId, callerRole, parsed.data);
    res.json({ guest });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to record invitation" });
  }
}

export async function getPublicInvitation(req: Request, res: Response): Promise<void> {
  try {
    const eventId = String(req.params.eventId);
    const card = await svc.getPublicInvitation(eventId);
    res.json({ card });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to get invitation card" });
  }
}
