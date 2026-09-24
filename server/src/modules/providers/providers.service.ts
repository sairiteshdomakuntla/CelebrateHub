import { prisma } from "../../lib/prisma.js";
import type {
  UpdateProviderDto,
  SetCategoriesDto,
  SetAvailabilityDto,
} from "./providers.schema.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notFound() {
  return Object.assign(new Error("Provider profile not found"), { statusCode: 404 });
}

function forbidden() {
  return Object.assign(new Error("Forbidden"), { statusCode: 403 });
}

const FULL_INCLUDE = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true } },
    },
  },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, sortOrder: true },
  },
  availability: {
    orderBy: { dayOfWeek: "asc" as const },
  },
};

// ─── Get own provider profile ─────────────────────────────────────────────────

export async function getMyProfile(userId: string) {
  let provider = await prisma.provider.findUnique({
    where: { userId },
    include: FULL_INCLUDE,
  });

  // Auto-create a minimal profile if this PROVIDER user has no Provider row yet
  // (can happen when accounts are created via paths that skip Provider creation)
  if (!provider) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });
    if (!user || user.role !== "PROVIDER") throw notFound();

    provider = await prisma.provider.create({
      data: {
        userId,
        businessName: user.name, // default — provider can update
      },
      include: FULL_INCLUDE,
    });
  }

  return provider;
}

// ─── Get any provider profile (public — for customers browsing) ───────────────

export async function getProviderById(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      ...FULL_INCLUDE,
      user: { select: { name: true, email: true } },
    },
  });
  if (!provider) throw notFound();
  return provider;
}

// ─── Update provider profile ──────────────────────────────────────────────────

export async function updateMyProfile(userId: string, dto: UpdateProviderDto) {
  const existing = await prisma.provider.findUnique({ where: { userId } });
  if (!existing) throw notFound();

  const updated = await prisma.provider.update({
    where: { userId },
    data: {
      ...(dto.businessName !== undefined && { businessName: dto.businessName }),
      ...(dto.description  !== undefined && { description:  dto.description  }),
      ...(dto.pricingMin   !== undefined && { pricingMin:   dto.pricingMin   }),
      ...(dto.pricingMax   !== undefined && { pricingMax:   dto.pricingMax   }),
      ...(dto.serviceArea  !== undefined && { serviceArea:  dto.serviceArea  }),
      ...(dto.latitude     !== undefined && {
        latitude: dto.latitude !== null ? String(dto.latitude) : null,
      }),
      ...(dto.longitude    !== undefined && {
        longitude: dto.longitude !== null ? String(dto.longitude) : null,
      }),
      ...(dto.isAvailable  !== undefined && { isAvailable:  dto.isAvailable  }),
    },
    include: FULL_INCLUDE,
  });

  return updated;
}

// ─── Set service categories (replace-all) ─────────────────────────────────────

export async function setCategories(userId: string, dto: SetCategoriesDto) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw notFound();

  // Verify all category IDs exist
  const cats = await prisma.serviceCategory.findMany({
    where: { id: { in: dto.categoryIds }, isActive: true },
    select: { id: true },
  });
  if (cats.length !== dto.categoryIds.length) {
    throw Object.assign(new Error("One or more category IDs are invalid"), { statusCode: 400 });
  }

  // Replace all in a transaction
  await prisma.$transaction([
    prisma.providerCategory.deleteMany({ where: { providerId: provider.id } }),
    prisma.providerCategory.createMany({
      data: dto.categoryIds.map((categoryId) => ({
        providerId: provider.id,
        categoryId,
      })),
    }),
  ]);

  return prisma.provider.findUnique({
    where: { userId },
    include: FULL_INCLUDE,
  });
}

// ─── Set weekly availability (replace-all) ────────────────────────────────────

export async function setAvailability(userId: string, dto: SetAvailabilityDto) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) throw notFound();

  await prisma.$transaction([
    prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } }),
    prisma.providerAvailability.createMany({
      data: dto.slots.map((slot) => ({
        providerId:  provider.id,
        dayOfWeek:   slot.dayOfWeek,
        startTime:   slot.startTime,
        endTime:     slot.endTime,
        isAvailable: slot.isAvailable,
      })),
      skipDuplicates: true,
    }),
  ]);

  return prisma.provider.findUnique({
    where: { userId },
    include: FULL_INCLUDE,
  });
}

// ─── Admin: list all providers with filters ───────────────────────────────────

export async function listProviders(params: {
  search?: string;
  verificationStatus?: string;
  page?: number;
  pageSize?: number;
}) {
  const page     = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;

  const where: any = {};
  if (params.verificationStatus) where.verificationStatus = params.verificationStatus;
  if (params.search) {
    where.OR = [
      { businessName: { contains: params.search, mode: "insensitive" } },
      { serviceArea:  { contains: params.search, mode: "insensitive" } },
      { user: { name:  { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [total, providers] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true } },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
    }),
  ]);

  return {
    providers,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ─── Admin: update verification status ───────────────────────────────────────

export async function updateVerificationStatus(
  providerId: string,
  status: "VERIFIED" | "REJECTED" | "PENDING" | "SUSPENDED",
  notes?: string
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound();

  return prisma.provider.update({
    where: { id: providerId },
    data: {
      verificationStatus: status,
      verificationNotes: notes,
      ...(status === "VERIFIED" && { verifiedAt: new Date() }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
