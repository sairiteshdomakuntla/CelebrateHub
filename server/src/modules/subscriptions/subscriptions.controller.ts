import { Request, Response } from "express";
import * as svc from "./subscriptions.service.js";
import { CreateOrderSchema, VerifyPaymentSchema } from "./subscriptions.schema.js";

function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return userId;
}

export async function listPlans(req: Request, res: Response): Promise<void> {
  try {
    const role = (req.query.role as string) || req.user?.role;
    const plans = await svc.listPlans(role);
    res.json({ plans });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to list plans" });
  }
}

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const subscription = await svc.getMySubscription(userId);
    res.json({ subscription });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to get subscription" });
  }
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid plan ID" });
      return;
    }
    const result = await svc.createRazorpayOrder(userId, parsed.data.planId);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to create order" });
  }
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const parsed = VerifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payment data" });
      return;
    }
    const result = await svc.verifyRazorpayPayment(userId, parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Payment verification failed" });
  }
}

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const result = await svc.cancelSubscription(userId);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to cancel subscription" });
  }
}

export async function adminListSubscriptions(req: Request, res: Response): Promise<void> {
  try {
    const subscriptions = await svc.adminListSubscriptions();
    res.json({ subscriptions });
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ message: err.message ?? "Failed to fetch subscriptions" });
  }
}

export async function getCheckoutPage(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, planId, userId } = req.query as { orderId: string; planId: string; userId: string };
    if (!orderId || !planId || !userId) {
      res.status(400).send("Missing orderId, planId, or userId parameters");
      return;
    }
    const html = await svc.getCheckoutHtml(orderId, planId, userId);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err: any) {
    res.status(err.statusCode ?? 500).send(err.message ?? "Failed to render Razorpay checkout");
  }
}
