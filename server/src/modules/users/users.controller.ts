import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { z } from "zod";
import bcrypt from "bcryptjs";

// GET /api/users/me
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        provider: {
          select: {
            id: true,
            businessName: true,
            description: true,
            serviceArea: true,
            verificationStatus: true,
            ratingAvg: true,
            ratingCount: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PATCH /api/users/me
export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      name:  z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(7).max(20).optional().nullable(),
    });

    const dto = schema.parse(req.body);
    const userId = req.user!.userId;

    // Check email uniqueness if changing
    if (dto.email) {
      const existing = await prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) {
        res.status(409).json({ success: false, message: "Email is already in use by another account." });
        return;
      }
    }

    // Check phone uniqueness if changing
    if (dto.phone) {
      const existing = await prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (existing) {
        res.status(409).json({ success: false, message: "Phone number is already in use by another account." });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name  !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email, emailVerified: false }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, status: true, emailVerified: true,
        phoneVerified: true, lastLoginAt: true, createdAt: true,
        provider: {
          select: {
            id: true, businessName: true, description: true,
            serviceArea: true, verificationStatus: true,
            ratingAvg: true, ratingCount: true, isAvailable: true,
          },
        },
      },
    });

    res.json({ success: true, data: user });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ success: false, message: err.errors[0]?.message ?? "Validation error" });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// PATCH /api/users/me/password
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8, "New password must be at least 8 characters"),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      res.status(400).json({ success: false, message: "No password set on this account." });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: "Current password is incorrect." });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ success: false, message: err.errors[0]?.message ?? "Validation error" });
      return;
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
