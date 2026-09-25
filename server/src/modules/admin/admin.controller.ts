import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const PAGE_SIZE = 20;

// GET /api/admin/users?role=&status=&search=&page=
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const where: any = {};
    if (role && ["CUSTOMER", "PROVIDER", "ADMIN"].includes(role)) where.role = role;
    if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          provider: { select: { businessName: true, verificationStatus: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PAGE_SIZE),
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PATCH /api/admin/users/:id/status
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const schema = z.object({
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
    });
    const { status } = schema.parse(req.body);

    // Prevent admin from suspending themselves
    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: "Cannot change your own status" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    if ((err as any)?.code === "P2025") {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(400).json({ success: false, message: (err as Error).message });
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (id === req.user!.userId) {
      res.status(400).json({ success: false, message: "Cannot delete your own account" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    if ((err as any)?.code === "P2025") {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// ─── Categories Management ───────────────────────────────────────────────────

export const EVENT_TYPES_CATALOG = [
  { type: "WEDDING",      label: "Wedding",          icon: "heart",     color: "#E11D48" },
  { type: "ENGAGEMENT",   label: "Engagement",       icon: "star",      color: "#D97706" },
  { type: "BIRTHDAY",     label: "Birthday Party",   icon: "gift",      color: "#7C3AED" },
  { type: "BABY_SHOWER",  label: "Baby Shower",      icon: "smile",     color: "#059669" },
  { type: "ANNIVERSARY",  label: "Anniversary",      icon: "bookmark",  color: "#EA580C" },
  { type: "HOUSEWARMING", label: "Housewarming",     icon: "home",      color: "#2563EB" },
  { type: "FESTIVAL",     label: "Festival & Puja",  icon: "sun",       color: "#CA8A04" },
  { type: "CORPORATE",    label: "Corporate Event",  icon: "briefcase", color: "#475569" },
  { type: "OTHER",        label: "Special Party",    icon: "award",     color: "#4F46E5" },
];

// GET /api/admin/categories
export async function listCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            providers: true,
            eventServices: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        categories,
        eventTypes: EVENT_TYPES_CATALOG,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to list categories" });
  }
}

// POST /api/admin/categories
export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters").max(60),
      slug: z.string().max(80).optional(),
      icon: z.string().max(50).optional().nullable(),
      isActive: z.boolean().default(true),
    });

    const parsed = schema.parse(req.body);
    const slug =
      parsed.slug?.trim().toLowerCase() ||
      parsed.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Check unique
    const existing = await prisma.serviceCategory.findFirst({
      where: {
        OR: [{ name: { equals: parsed.name.trim(), mode: "insensitive" } }, { slug }],
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: "A category with this name or slug already exists",
      });
      return;
    }

    const category = await prisma.serviceCategory.create({
      data: {
        name: parsed.name.trim(),
        slug,
        icon: parsed.icon?.trim() || null,
        isActive: parsed.isActive,
      },
      include: {
        _count: {
          select: {
            providers: true,
            eventServices: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Failed to create category" });
  }
}

// PATCH /api/admin/categories/:id
export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const schema = z.object({
      name: z.string().min(2).max(60).optional(),
      slug: z.string().max(80).optional(),
      icon: z.string().max(50).optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.parse(req.body);

    const category = await prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name.trim() }),
        ...(parsed.slug !== undefined && {
          slug: parsed.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        }),
        ...(parsed.icon !== undefined && { icon: parsed.icon?.trim() || null }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
      include: {
        _count: {
          select: {
            providers: true,
            eventServices: true,
          },
        },
      },
    });

    res.json({ success: true, data: category });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }
    res.status(400).json({ success: false, message: err?.message || "Failed to update category" });
  }
}

// DELETE /api/admin/categories/:id
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { providers: true, eventServices: true },
        },
      },
    });

    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    // If providers or events are linked, deactivate instead of foreign key violation
    if (category._count.providers > 0 || category._count.eventServices > 0) {
      await prisma.serviceCategory.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({
        success: true,
        message: `Category has ${category._count.providers} providers & ${category._count.eventServices} events linked; it has been deactivated instead of permanently deleted.`,
        deactivated: true,
      });
      return;
    }

    await prisma.serviceCategory.delete({ where: { id } });
    res.json({ success: true, message: "Category permanently deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to delete category" });
  }
}

// ─── Subscription Plans Management ───────────────────────────────────────────

// GET /api/admin/plans
export async function listPlans(_req: Request, res: Response): Promise<void> {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [{ isActive: "desc" }, { price: "asc" }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    // Calculate active subscriber counts & metrics
    const activeSubs = await prisma.subscription.groupBy({
      by: ["planId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    });

    const activeMap = new Map(activeSubs.map((s) => [s.planId, s._count._all]));

    const enrichedPlans = plans.map((p) => ({
      ...p,
      activeSubscribers: activeMap.get(p.id) || 0,
      targetRole: p.slug.startsWith("provider-") ? "PROVIDER" : "CUSTOMER",
    }));

    const totalSubscribers = enrichedPlans.reduce((sum, p) => sum + p.activeSubscribers, 0);

    // Approximate Monthly Recurring Revenue
    const estimatedMRR = enrichedPlans.reduce((sum, p) => {
      if (p.price === 0) return sum;
      const monthlyEquiv = p.interval === "YEARLY" ? Math.round(p.price / 12) : p.price;
      return sum + monthlyEquiv * p.activeSubscribers;
    }, 0);

    res.json({
      success: true,
      data: {
        plans: enrichedPlans,
        stats: {
          totalPlans: plans.length,
          activePlans: plans.filter((p) => p.isActive).length,
          totalSubscribers,
          estimatedMRR,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to list plans" });
  }
}

// POST /api/admin/plans
export async function createPlan(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
      slug: z.string().max(100).optional(),
      description: z.string().max(500).optional().nullable(),
      price: z.number().int().nonnegative("Price must be 0 or greater"),
      currency: z.string().default("INR"),
      interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
      isActive: z.boolean().default(true),
      targetRole: z.enum(["PROVIDER", "CUSTOMER"]).default("PROVIDER"),
    });

    const parsed = schema.parse(req.body);

    // Build slug with role prefix if not already present
    let slug = parsed.slug?.trim().toLowerCase();
    if (!slug) {
      const baseSlug = parsed.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const prefix = parsed.targetRole.toLowerCase();
      slug = baseSlug.startsWith(prefix) ? baseSlug : `${prefix}-${baseSlug}`;
    }

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: `A plan with slug "${slug}" already exists`,
      });
      return;
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: parsed.name.trim(),
        slug,
        description: parsed.description?.trim() || null,
        price: parsed.price,
        currency: parsed.currency,
        interval: parsed.interval,
        isActive: parsed.isActive,
      },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Failed to create plan" });
  }
}

// PATCH /api/admin/plans/:id
export async function updatePlan(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      slug: z.string().max(100).optional(),
      description: z.string().max(500).optional().nullable(),
      price: z.number().int().nonnegative().optional(),
      currency: z.string().optional(),
      interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.parse(req.body);

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name.trim() }),
        ...(parsed.slug !== undefined && {
          slug: parsed.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        }),
        ...(parsed.description !== undefined && {
          description: parsed.description?.trim() || null,
        }),
        ...(parsed.price !== undefined && { price: parsed.price }),
        ...(parsed.currency !== undefined && { currency: parsed.currency }),
        ...(parsed.interval !== undefined && { interval: parsed.interval }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
      },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    res.json({ success: true, data: plan });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Subscription plan not found" });
      return;
    }
    res.status(400).json({ success: false, message: err?.message || "Failed to update plan" });
  }
}

// DELETE /api/admin/plans/:id
export async function deletePlan(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: "Subscription plan not found" });
      return;
    }

    if (plan._count.subscriptions > 0) {
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({
        success: true,
        message: `Plan has ${plan._count.subscriptions} historical subscriptions and was deactivated instead of permanently deleted.`,
        deactivated: true,
      });
      return;
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    res.json({ success: true, message: "Subscription plan permanently deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to delete plan" });
  }
}

// ─── Review Moderation ────────────────────────────────────────────────────────

// GET /api/admin/reviews?status=&rating=&search=
export async function listReviews(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const ratingStr = req.query.rating as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (ratingStr && !isNaN(parseInt(ratingStr, 10))) {
      where.rating = parseInt(ratingStr, 10);
    }
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { author: { name: { contains: search, mode: "insensitive" } } },
        { provider: { businessName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, flaggedCount, hiddenCount, reviews] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { status: "FLAGGED" } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.review.findMany({
        where,
        orderBy: [{ isFlagged: "desc" }, { createdAt: "desc" }],
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          provider: {
            select: { id: true, businessName: true, user: { select: { name: true } } },
          },
          booking: {
            select: { id: true, status: true, agreedPrice: true },
          },
        },
      }),
    ]);

    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : 5.0;

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews: total,
          flaggedCount,
          hiddenCount,
          avgRating,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to list reviews" });
  }
}

// PATCH /api/admin/reviews/:id/status
export async function updateReviewStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const schema = z.object({
      status: z.enum(["APPROVED", "FLAGGED", "HIDDEN"]),
      flagReason: z.string().optional().nullable(),
      moderationNotes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(req.body);

    const updated = await prisma.review.update({
      where: { id },
      data: {
        status: parsed.status,
        isFlagged: parsed.status === "FLAGGED",
        flagReason: parsed.flagReason !== undefined ? parsed.flagReason : undefined,
        moderationNotes: parsed.moderationNotes !== undefined ? parsed.moderationNotes : undefined,
        moderatedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true } },
        provider: { select: { id: true, businessName: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }
    res.status(400).json({ success: false, message: err?.message || "Failed to update review" });
  }
}

// DELETE /api/admin/reviews/:id
export async function deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await prisma.review.delete({ where: { id } });
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Review not found" });
      return;
    }
    res.status(500).json({ success: false, message: err?.message || "Failed to delete review" });
  }
}

// ─── Platform Issues & Disputes ───────────────────────────────────────────────

// GET /api/admin/issues?status=&priority=&category=
export async function listIssues(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const category = req.query.category as string | undefined;

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;
    if (category && category !== "ALL") where.category = category;

    const [total, openCount, inProgressCount, resolvedCount, issues] = await Promise.all([
      prisma.platformIssue.count(),
      prisma.platformIssue.count({ where: { status: "OPEN" } }),
      prisma.platformIssue.count({ where: { status: "IN_PROGRESS" } }),
      prisma.platformIssue.count({ where: { status: "RESOLVED" } }),
      prisma.platformIssue.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, role: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        issues,
        stats: {
          total,
          openCount,
          inProgressCount,
          resolvedCount,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to list issues" });
  }
}

// POST /api/admin/issues
export async function createIssue(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      userId: z.string().uuid().optional(),
      title: z.string().min(3).max(150),
      description: z.string().min(5).max(1000),
      category: z.string().default("BOOKING_DISPUTE"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    });

    const parsed = schema.parse(req.body);
    const userId = parsed.userId || req.user!.userId;

    const issue = await prisma.platformIssue.create({
      data: {
        userId,
        title: parsed.title.trim(),
        description: parsed.description.trim(),
        category: parsed.category,
        priority: parsed.priority,
        status: "OPEN",
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(201).json({ success: true, data: issue });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Failed to create issue" });
  }
}

// PATCH /api/admin/issues/:id
export async function updateIssue(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const schema = z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      resolutionNotes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(req.body);

    const issue = await prisma.platformIssue.update({
      where: { id },
      data: {
        ...(parsed.status !== undefined && { status: parsed.status }),
        ...(parsed.priority !== undefined && { priority: parsed.priority }),
        ...(parsed.resolutionNotes !== undefined && {
          resolutionNotes: parsed.resolutionNotes?.trim() || null,
        }),
        ...(parsed.status === "RESOLVED" && { resolvedAt: new Date() }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json({ success: true, data: issue });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    res.status(400).json({ success: false, message: err?.message || "Failed to update issue" });
  }
}

// DELETE /api/admin/issues/:id
export async function deleteIssue(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await prisma.platformIssue.delete({ where: { id } });
    res.json({ success: true, message: "Issue deleted successfully" });
  } catch (err: any) {
    if (err?.code === "P2025") {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    res.status(500).json({ success: false, message: err?.message || "Failed to delete issue" });
  }
}

// ============================================================
// DASHBOARD STATS & ANALYTICS
// ============================================================

// GET /api/admin/stats
export async function getAdminStats(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      providersCount,
      customersCount,
      adminsCount,
      totalEvents,
      activeEvents,
      totalLeads,
      acceptedLeads,
      totalBookings,
      completedBookings,
      activeSubscriptions,
      pendingVerifications,
      flaggedReviews,
      openIssues,
      bookingsWithPrice,
      subscriptionPlans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: { in: ["PUBLISHED", "IN_PROGRESS"] } } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "ACCEPTED" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.provider.count({ where: { verificationStatus: "PENDING" } }),
      prisma.review.count({ where: { isFlagged: true } }),
      prisma.platformIssue.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.booking.findMany({
        where: { agreedPrice: { not: null } },
        select: { agreedPrice: true, commissionAmount: true, commissionRate: true, status: true },
      }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: { select: { price: true, interval: true } } },
      }),
    ]);

    const grossMerchandiseValue = bookingsWithPrice.reduce((acc, b) => acc + (b.agreedPrice || 0), 0);
    const totalCommissions = bookingsWithPrice.reduce((acc, b) => {
      if (b.commissionAmount !== null && b.commissionAmount !== undefined) return acc + b.commissionAmount;
      const rate = b.commissionRate ? Number(b.commissionRate) : 10;
      return acc + Math.round(((b.agreedPrice || 0) * rate) / 100);
    }, 0);

    const mrr = subscriptionPlans.reduce((acc, sub) => {
      const price = sub.plan?.price || 0;
      return sub.plan?.interval === "YEARLY" ? acc + Math.round(price / 12) : acc + price;
    }, 0);

    const leadConversionRate = totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        providersCount,
        customersCount,
        adminsCount,
        totalEvents,
        activeEvents,
        totalLeads,
        acceptedLeads,
        leadConversionRate,
        totalBookings,
        completedBookings,
        activeSubscriptions,
        pendingVerifications,
        flaggedReviews,
        openIssues,
        grossMerchandiseValue,
        totalCommissions,
        mrr,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to fetch dashboard stats" });
  }
}

// GET /api/admin/analytics
export async function getAdminAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const [categories, leadsWithCategory, bookings, recentIssues, leadProviders] = await Promise.all([
      prisma.serviceCategory.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { eventServices: true, providers: true } },
        },
      }),
      prisma.lead.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          eventService: {
            include: {
              category: { select: { id: true, name: true } },
              event: { select: { title: true, type: true } },
            },
          },
        },
      }),
      prisma.booking.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true, email: true } },
          provider: { select: { businessName: true } },
        },
      }),
      prisma.platformIssue.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, role: true } } },
      }),
      prisma.leadProvider.findMany({
        select: { status: true },
      }),
    ]);

    // Calculate lead funnel
    const totalDispatched = leadProviders.length;
    const viewedCount = leadProviders.filter((lp) => lp.status === "VIEWED" || lp.status === "ACCEPTED").length;
    const acceptedCount = leadProviders.filter((lp) => lp.status === "ACCEPTED").length;

    // Category breakdown
    const categoryStats = categories.map((cat) => ({
      name: cat.name,
      slug: cat.slug,
      leadsCount: cat._count.eventServices,
      providersCount: cat._count.providers,
    }));

    res.json({
      success: true,
      data: {
        funnel: {
          totalDispatched,
          viewedCount,
          acceptedCount,
        },
        categoryStats,
        recentBookings: bookings.map((b) => ({
          id: b.id,
          customerName: b.customer?.name || "Customer",
          providerName: b.provider?.businessName || "Provider",
          agreedPrice: b.agreedPrice || 0,
          commissionAmount: b.commissionAmount || Math.round(((b.agreedPrice || 0) * (b.commissionRate ? Number(b.commissionRate) : 10)) / 100),
          status: b.status,
          createdAt: b.createdAt,
        })),
        recentIssues: recentIssues.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          priority: i.priority,
          status: i.status,
          userName: i.user?.name || "User",
          createdAt: i.createdAt,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to fetch analytics" });
  }
}

// ============================================================
// PLATFORM SETTINGS & COMMISSION CONFIGURATION
// ============================================================

const DEFAULT_SETTINGS = [
  {
    key: "MAX_PROVIDERS_PER_LEAD",
    value: "5",
    label: "Max Providers Per Lead",
    description: "Number of qualified providers alerted simultaneously upon customer service request",
    category: "LEADS",
  },
  {
    key: "PLATFORM_COMMISSION_PCT",
    value: "10.0",
    label: "Platform Commission Rate (%)",
    description: "Standard percentage commission deducted from provider payout on completed bookings",
    category: "PAYMENTS",
  },
  {
    key: "INSTANT_LEAD_MATCHING",
    value: "true",
    label: "Instant Lead Matching",
    description: "Trigger immediate push/in-app dispatch upon customer event request publication",
    category: "LEADS",
  },
  {
    key: "AUTO_APPROVE_VERIFIED_PROVIDERS",
    value: "false",
    label: "Auto-Approve Providers with Full KYC",
    description: "Automatically grant verified badge to providers submitting complete GSTIN & ID proofs",
    category: "SYSTEM",
  },
];

// GET /api/admin/settings
export async function getPlatformSettings(req: Request, res: Response): Promise<void> {
  try {
    let settings = await prisma.platformSetting.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed defaults if not present
    if (settings.length === 0) {
      await Promise.all(
        DEFAULT_SETTINGS.map((s) =>
          prisma.platformSetting.create({
            data: s,
          })
        )
      );
      settings = await prisma.platformSetting.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Failed to fetch platform settings" });
  }
}

// PATCH /api/admin/settings/:key
export async function updatePlatformSetting(req: Request, res: Response): Promise<void> {
  try {
    const key = req.params.key as string;
    const schema = z.object({
      value: z.string().min(1, "Value is required"),
    });

    const parsed = schema.parse(req.body);

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: { value: parsed.value },
      create: {
        key,
        value: parsed.value,
        label: key.replace(/_/g, " "),
        category: "CUSTOM",
      },
    });

    res.json({ success: true, data: setting });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || "Failed to update setting" });
  }
}

