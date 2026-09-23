import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

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
