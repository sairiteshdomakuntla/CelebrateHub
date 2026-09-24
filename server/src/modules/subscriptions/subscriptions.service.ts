import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import type { VerifyPaymentDto } from "./subscriptions.schema.js";

function getRazorpayInstance(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw Object.assign(
      new Error(
        "Razorpay API credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env"
      ),
      { statusCode: 500 }
    );
  }

  return new Razorpay({ key_id, key_secret });
}

// ─── List Plans ───────────────────────────────────────────────────────────────

export async function listPlans(role?: string) {
  let where: any = { isActive: true };

  if (role === "PROVIDER") {
    where.slug = { startsWith: "provider-" };
  } else if (role === "CUSTOMER") {
    where.slug = { startsWith: "customer-" };
  }

  return prisma.subscriptionPlan.findMany({
    where,
    orderBy: { price: "asc" },
  });
}

// ─── Get User's Active Subscription ───────────────────────────────────────────

export async function getMySubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
    },
  });

  if (subscription && subscription.endDate && new Date(subscription.endDate) < new Date()) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  return subscription;
}

// ─── Create Razorpay Order ────────────────────────────────────────────────────

export async function createRazorpayOrder(userId: string, planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw Object.assign(new Error("Subscription plan not found or inactive"), { statusCode: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  // 1. Free plan activation
  if (plan.price === 0) {
    await prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        endDate,
        autoRenew: true,
        paymentProvider: "FREE",
        externalId: `free_${userId.slice(0, 8)}_${Date.now()}`,
      },
      include: { plan: true },
    });

    return {
      free: true,
      message: "Free plan activated successfully",
      subscription,
    };
  }

  // 2. Real Razorpay Order Creation via official SDK
  const razorpay = getRazorpayInstance();
  const amountPaise = plan.price * 100;
  const receipt = `sub_${userId.slice(0, 8)}_${Date.now()}`;

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes: {
      userId,
      planId: plan.id,
      planName: plan.name,
    },
  });

  return {
    free: false,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
    },
    user: {
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  };
}

// ─── Render Razorpay Checkout HTML ────────────────────────────────────────────

export async function getCheckoutHtml(orderId: string, planId: string, userId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw Object.assign(new Error("Plan not found"), { statusCode: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const amountPaise = plan.price * 100;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Razorpay Checkout · CelebrateHub</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #F7F7F5;
      color: #1C1C1E;
      text-align: center;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E5E4E0;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .spinner {
      border: 3px solid #F0EEEA;
      border-top: 3px solid #1C1C1E;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .btn {
      background: #1C1C1E;
      color: #FFFFFF;
      border: none;
      padding: 14px 24px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2 style="font-size: 18px; margin: 0 0 8px;">Opening Razorpay Checkout</h2>
    <p style="color: #6E6E73; font-size: 14px; margin: 0;">${plan.name} · ₹${plan.price}</p>
    <button class="btn" id="rzp-btn" onclick="openRzp()">Tap to Open Razorpay</button>
  </div>

  <script>
    var options = {
      "key": "${keyId}",
      "amount": "${amountPaise}",
      "currency": "INR",
      "name": "CelebrateHub",
      "description": "${plan.name} (${plan.interval})",
      "order_id": "${orderId}",
      "prefill": {
        "name": "${user.name || ""}",
        "email": "${user.email || ""}",
        "contact": "${user.phone || ""}"
      },
      "theme": {
        "color": "#1C1C1E"
      },
      "handler": function (response) {
        var url = "celebratehub://payment-success?" +
          "razorpay_payment_id=" + encodeURIComponent(response.razorpay_payment_id) +
          "&razorpay_order_id=" + encodeURIComponent(response.razorpay_order_id) +
          "&razorpay_signature=" + encodeURIComponent(response.razorpay_signature) +
          "&plan_id=" + encodeURIComponent("${planId}");
        window.location.href = url;
      },
      "modal": {
        "ondismiss": function() {
          window.location.href = "celebratehub://payment-cancelled";
        }
      }
    };

    var rzp = new Razorpay(options);
    function openRzp() {
      rzp.open();
    }
    window.onload = function() {
      setTimeout(openRzp, 300);
    };
  </script>
</body>
</html>`;
}

// ─── Verify Payment with Razorpay SDK & Signature ─────────────────────────────

export async function verifyRazorpayPayment(userId: string, dto: VerifyPaymentDto) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: dto.planId },
  });

  if (!plan) {
    throw Object.assign(new Error("Plan not found"), { statusCode: 404 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw Object.assign(
      new Error("RAZORPAY_KEY_SECRET is not configured on the server"),
      { statusCode: 500 }
    );
  }

  // 1. Strict HMAC SHA256 Signature Verification
  const text = `${dto.razorpay_order_id}|${dto.razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(text)
    .digest("hex");

  if (generatedSignature !== dto.razorpay_signature) {
    throw Object.assign(
      new Error("Invalid Razorpay payment signature. Payment cannot be verified."),
      { statusCode: 400 }
    );
  }

  // 2. Fetch Payment status directly from Razorpay API
  const razorpay = getRazorpayInstance();
  try {
    const payment = await razorpay.payments.fetch(dto.razorpay_payment_id);
    if (!payment || (payment.status !== "captured" && payment.status !== "authorized")) {
      throw Object.assign(
        new Error(`Payment has not been captured yet. Razorpay status: ${payment?.status}`),
        { statusCode: 400 }
      );
    }
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw Object.assign(
      new Error(`Failed to fetch payment details from Razorpay: ${err.message}`),
      { statusCode: 400 }
    );
  }

  // 3. Cancel any current active subscriptions
  await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  // 4. Calculate subscription duration
  const now = new Date();
  let endDate: Date;
  if (plan.interval === "YEARLY") {
    endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  } else {
    endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      startDate: now,
      endDate,
      autoRenew: true,
      paymentProvider: "RAZORPAY",
      externalId: dto.razorpay_payment_id,
    },
    include: { plan: true },
  });

  // 5. Create in-app Notification
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "SUBSCRIPTION",
        title: "Subscription Activated! 🎉",
        body: `Your payment was verified. You are now active on the ${plan.name} plan until ${endDate.toLocaleDateString("en-IN")}.`,
      },
    });
  } catch (nErr) {
    console.warn("Could not create subscription notification:", nErr);
  }

  return {
    message: "Subscription activated successfully!",
    subscription,
  };
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(userId: string) {
  const activeSub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (!activeSub) {
    throw Object.assign(new Error("No active subscription found"), { statusCode: 404 });
  }

  const updated = await prisma.subscription.update({
    where: { id: activeSub.id },
    data: {
      autoRenew: false,
      status: "CANCELLED",
    },
    include: { plan: true },
  });

  return {
    message: "Subscription cancelled successfully",
    subscription: updated,
  };
}

// ─── Admin: List All Subscriptions ────────────────────────────────────────────

export async function adminListSubscriptions() {
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      plan: true,
    },
  });
}
