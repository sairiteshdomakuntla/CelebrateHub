import { Request, Response } from "express";
import * as svc from "./gifts.service.js";
import { renderPublicRegistryHtml } from "./gifts.public-html.js";
import {
  createGiftItemSchema,
  updateGiftItemSchema,
  claimGiftItemSchema,
  createContributionSchema,
} from "./gifts.schema.js";

function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return userId;
}

// ─── Get Event Gift Circle ───────────────────────────────────────────────────

export async function getGiftCircle(req: Request, res: Response): Promise<void> {
  try {
    const eventId = String(req.params.eventId);
    const userId = req.user?.userId; // optional if accessed via public guest link
    const data = await svc.getEventGiftCircle(eventId, userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to get Gift Circle" });
  }
}

// ─── Add Item to Registry ────────────────────────────────────────────────────

export async function addGiftItem(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const eventId = String(req.params.eventId);
    const parsed = createGiftItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid item data" });
      return;
    }
    const item = await svc.addGiftItem(eventId, userId, parsed.data);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to add gift item" });
  }
}

// ─── Update Item ─────────────────────────────────────────────────────────────

export async function updateGiftItem(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const parsed = updateGiftItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid update data" });
      return;
    }
    const item = await svc.updateGiftItem(id, userId, parsed.data);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to update gift item" });
  }
}

// ─── Delete Item ─────────────────────────────────────────────────────────────

export async function deleteGiftItem(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    await svc.deleteGiftItem(id, userId);
    res.json({ success: true, message: "Gift item deleted" });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to delete gift item" });
  }
}

// ─── Claim Item ──────────────────────────────────────────────────────────────

export async function claimGiftItem(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const parsed = claimGiftItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid claim data" });
      return;
    }
    const item = await svc.claimGiftItem(id, parsed.data);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to claim gift item" });
  }
}

// ─── Unclaim Item ────────────────────────────────────────────────────────────

export async function unclaimGiftItem(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const userId = req.user?.userId;
    const item = await svc.unclaimGiftItem(id, userId);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to unclaim gift item" });
  }
}

// ─── Contribute / Cash Blessing ──────────────────────────────────────────────

export async function createContribution(req: Request, res: Response): Promise<void> {
  try {
    const eventId = String(req.params.eventId);
    const parsed = createContributionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message ?? "Invalid contribution data" });
      return;
    }
    const contribution = await svc.createContribution(eventId, parsed.data);
    res.status(201).json({ success: true, data: contribution });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to record contribution" });
  }
}

// ─── Thank Contributor ───────────────────────────────────────────────────────

export async function thankContribution(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const updated = await svc.thankContribution(id, userId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? "Failed to update thank status" });
  }
}

// ─── Render Public Registry HTML Webpage (no login needed for guests) ─────────

export async function renderPublicRegistryPage(req: Request, res: Response): Promise<void> {
  try {
    const eventId = String(req.params.eventId);
    const data = await svc.getEventGiftCircle(eventId);
    const html = renderPublicRegistryHtml(data);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>CelebrateHub · Registry</title></head>
      <body style="font-family:system-ui,-apple-system,sans-serif; text-align:center; padding:60px 20px; background:#F7F7F5; color:#1C1C1E;">
        <h2 style="font-size:24px; margin-bottom:8px;">Celebration Registry Not Found</h2>
        <p style="color:#71717A; max-width:400px; margin:0 auto 24px;">${err.message ?? "The requested celebration registry could not be found or has concluded."}</p>
      </body>
      </html>
    `);
  }
}
