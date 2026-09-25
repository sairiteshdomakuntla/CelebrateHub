import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import type { RegisterDto, RegisterProviderDto, LoginDto, CreateUserDto } from "./auth.schema.js";

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// ─── Helpers ────────────────────────────────────────────────────────────────

function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

function buildTokenPair(userId: string, role: string) {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId, role });
  return { accessToken, refreshToken };
}

async function persistSession(
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
) {
  await prisma.userSession.create({
    data: {
      userId,
      refreshToken,
      expiresAt: refreshTokenExpiresAt(),
      ipAddress,
      userAgent,
    },
  });
}

// ─── Public: Customer self-registration ──────────────────────────────────────

export async function register(
  dto: RegisterDto,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  // Check uniqueness
  if (dto.email) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new Error("An account with this email already exists");
  }
  if (dto.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new Error("An account with this phone number already exists");
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const { accessToken, refreshToken } = buildTokenPair(user.id, user.role);
  await persistSession(user.id, refreshToken, meta?.ipAddress, meta?.userAgent);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// ─── Public: Provider self-registration & onboarding ──────────────────────────

export async function registerProvider(
  dto: RegisterProviderDto,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  // Check uniqueness
  if (dto.email) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new Error("An account with this email already exists");
  }
  if (dto.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new Error("An account with this phone number already exists");
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  // Create User + Provider in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: "PROVIDER",
      },
    });

    const provider = await tx.provider.create({
      data: {
        userId: user.id,
        businessName: dto.businessName.trim(),
        description: dto.description?.trim() || null,
        serviceArea: dto.serviceArea.trim(),
        pricingMin: dto.pricingMin || null,
        pricingMax: dto.pricingMax || null,
        verificationStatus: "PENDING",
      },
    });

    // Link initial service categories
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      await tx.providerCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({
          providerId: provider.id,
          categoryId,
        })),
        skipDuplicates: true,
      });
    }

    // Seed default availability (all 7 days, 09:00 - 21:00)
    const days = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ] as const;

    await tx.providerAvailability.createMany({
      data: days.map((dayOfWeek) => ({
        providerId: provider.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "21:00",
        isAvailable: true,
      })),
      skipDuplicates: true,
    });

    return { user, provider };
  });

  const { accessToken, refreshToken } = buildTokenPair(result.user.id, result.user.role);
  await persistSession(result.user.id, refreshToken, meta?.ipAddress, meta?.userAgent);

  return {
    user: sanitizeUser(result.user),
    provider: result.provider,
    accessToken,
    refreshToken,
  };
}

// ─── Public: Login (all roles) ───────────────────────────────────────────────

export async function login(
  dto: LoginDto,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const user = dto.email
    ? await prisma.user.findUnique({ where: { email: dto.email } })
    : await prisma.user.findUnique({ where: { phone: dto.phone } });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account has been suspended or deactivated");
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { accessToken, refreshToken } = buildTokenPair(user.id, user.role);
  await persistSession(user.id, refreshToken, meta?.ipAddress, meta?.userAgent);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

// ─── Refresh token rotation ───────────────────────────────────────────────────

export async function refreshToken(
  token: string,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  // Verify the JWT signature first
  const payload = verifyRefreshToken(token);

  // Find matching session
  const session = await prisma.userSession.findUnique({
    where: { refreshToken: token },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new Error("Invalid or expired refresh token");
  }

  if (session.userId !== payload.userId) {
    throw new Error("Token mismatch");
  }

  // Revoke old session
  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair
  const { accessToken, refreshToken: newRefreshToken } = buildTokenPair(
    session.user.id,
    session.user.role
  );
  await persistSession(session.user.id, newRefreshToken, meta?.ipAddress, meta?.userAgent);

  return {
    user: sanitizeUser(session.user),
    accessToken,
    refreshToken: newRefreshToken,
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(token: string) {
  await prisma.userSession.updateMany({
    where: { refreshToken: token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Admin: Create any user ───────────────────────────────────────────────────

export async function adminCreateUser(dto: CreateUserDto) {
  if (dto.email) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new Error("An account with this email already exists");
  }
  if (dto.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new Error("An account with this phone number already exists");
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
    },
  });

  // If provider role, create the Provider record
  if (dto.role === "PROVIDER") {
    await prisma.provider.create({
      data: {
        userId: user.id,
        businessName: dto.businessName!,
        description: dto.description,
        serviceArea: dto.serviceArea,
      },
    });
  }

  return { user: sanitizeUser(user) };
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  };
}
