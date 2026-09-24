import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "./leads.service.js";
import { AcceptLeadSchema, DeclineLeadSchema } from "./leads.schema.js";

function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return userId;
}

export async function getProviderLeads(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const tab = (req.query.tab as any) || "available";
    const leads = await svc.getProviderLeads(userId, tab);
    res.json({ leads });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch leads" });
  }
}

export async function getProviderLeadStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const stats = await svc.getProviderLeadStats(userId);
    res.json(stats);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch lead stats" });
  }
}

export async function getLeadDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const lead = await svc.getLeadDetail(id, userId);
    res.json({ lead });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch lead detail" });
  }
}

export async function acceptLead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const parsed = AcceptLeadSchema.safeParse(req.body);
    const dto = parsed.success ? parsed.data : undefined;
    const result = await svc.acceptLead(id, userId, dto);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to accept lead" });
  }
}

export async function declineLead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const parsed = DeclineLeadSchema.safeParse(req.body);
    const dto = parsed.success ? parsed.data : undefined;
    const result = await svc.declineLead(id, userId, dto);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to decline lead" });
  }
}

export async function getEventLeadsForCustomer(req: Request, res: Response): Promise<void> {
  try {
    const callerId = getUserId(req);
    const callerRole = req.user!.role;
    const eventId = String(req.params.eventId);
    const leads = await svc.getEventLeadsForCustomer(eventId, callerId, callerRole);
    res.json({ services: leads });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch event leads" });
  }
}

export async function adminListLeads(req: Request, res: Response): Promise<void> {
  try {
    const leads = await svc.adminListLeads();
    res.json({ leads });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch admin leads" });
  }
}
