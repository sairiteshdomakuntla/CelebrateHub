import { Request, Response } from "express";
import { CreateReviewSchema, UpdateReviewSchema } from "./reviews.schema";
import * as svc from "./reviews.service";

function handleError(res: Response, err: any) {
  const statusCode = err?.statusCode || (err?.name === "ZodError" ? 400 : 500);
  const message = err?.errors ? err.errors[0]?.message : (err?.message || "Internal server error");
  res.status(statusCode).json({ success: false, message });
}

// POST /api/reviews
export async function createReview(req: Request, res: Response): Promise<void> {
  try {
    const dto = CreateReviewSchema.parse(req.body);
    const review = await svc.createReview(req.user!.userId, dto);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    handleError(res, err);
  }
}

// PATCH /api/reviews/:id
export async function updateReview(req: Request, res: Response): Promise<void> {
  try {
    const dto = UpdateReviewSchema.parse(req.body);
    const review = await svc.updateReview(req.user!.userId, req.params.id as string, dto);
    res.json({ success: true, data: review });
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /api/reviews/:id
export async function deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const result = await svc.deleteReview(req.user!.userId, req.user!.role, req.params.id as string);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/reviews/provider/:providerId  (public)
export async function getProviderReviews(req: Request, res: Response): Promise<void> {
  try {
    const data = await svc.getProviderReviews(req.params.providerId as string);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/reviews/my  (customer authored reviews)
export async function getMyReviews(req: Request, res: Response): Promise<void> {
  try {
    const data = await svc.getMyReviews(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/reviews/received  (provider received reviews)
export async function getProviderReceivedReviews(req: Request, res: Response): Promise<void> {
  try {
    const data = await svc.getProviderReceivedReviews(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

// GET /api/reviews/booking/:bookingId
export async function getBookingReview(req: Request, res: Response): Promise<void> {
  try {
    const review = await svc.getBookingReview(req.params.bookingId as string, req.user!.userId, req.user!.role);
    res.json({ success: true, data: review });
  } catch (err) {
    handleError(res, err);
  }
}
