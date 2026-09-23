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
    const { id } = req.params;
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
    const { id } = req.params;

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
