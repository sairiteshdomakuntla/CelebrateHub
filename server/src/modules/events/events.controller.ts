import { Request, Response } from "express";
import {
  CreateEventSchema,
  UpdateEventSchema,
  AddServiceSchema,
} from "./events.schema.js";
import * as svc from "./events.service.js";

function handleError(res: Response, err: unknown) {
  const e = err as any;
  const status = e?.statusCode ?? 500;
  const message = e?.message ?? "Internal server error";
  res.status(status).json({ success: false, message });
}

// GET /api/events
export async function listEvents(req: Request, res: Response): Promise<void> {
  try {
    const events = await svc.listEvents(req.user!.userId);
    res.json({ success: true, data: events });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/events/:id
export async function getEvent(req: Request, res: Response): Promise<void> {
  try {
    const event = await svc.getEvent(req.params.id as string, req.user!.userId, req.user!.role);
    res.json({ success: true, data: event });
  } catch (err) {
    handleError(res, err);
  }
}

// POST /api/events
export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const dto = CreateEventSchema.parse(req.body);
    const event = await svc.createEvent(req.user!.userId, dto);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    handleError(res, err);
  }
}

// PATCH /api/events/:id
export async function updateEvent(req: Request, res: Response): Promise<void> {
  try {
    const dto = UpdateEventSchema.parse(req.body);
    const event = await svc.updateEvent(req.params.id as string, req.user!.userId, req.user!.role, dto);
    res.json({ success: true, data: event });
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /api/events/:id
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  try {
    await svc.deleteEvent(req.params.id as string, req.user!.userId, req.user!.role);
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    handleError(res, err);
  }
}

// POST /api/events/:id/services
export async function addService(req: Request, res: Response): Promise<void> {
  try {
    const dto = AddServiceSchema.parse(req.body);
    const service = await svc.addService(req.params.id as string, req.user!.userId, req.user!.role, dto);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /api/events/:id/services/:categoryId
export async function removeService(req: Request, res: Response): Promise<void> {
  try {
    await svc.removeService(req.params.id as string, req.params.categoryId as string, req.user!.userId, req.user!.role);
    res.json({ success: true, message: "Service removed" });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/events/categories
export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await svc.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    handleError(res, err);
  }
}
