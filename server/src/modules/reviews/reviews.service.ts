import prisma from "../../lib/prisma";
import type { CreateReviewDto, UpdateReviewDto } from "./reviews.schema";

// ─── Rating sync helper ───────────────────────────────────────────────────────

export async function syncProviderRating(providerId: string) {
  const agg = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avg = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
  const count = agg._count.rating || 0;

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      ratingAvg: avg,
      ratingCount: count,
    },
  });

  return { ratingAvg: avg, ratingCount: count };
}

// ─── Create Review ────────────────────────────────────────────────────────────

export async function createReview(userId: string, dto: CreateReviewDto) {
  const booking = await prisma.booking.findUnique({
    where: { id: dto.bookingId },
    include: {
      review: true,
      provider: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      lead: {
        include: {
          eventService: {
            include: {
              category: true,
              event: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { statusCode: 404 });
  }

  // Only the customer who booked the service can write a review
  if (booking.customerId !== userId) {
    throw Object.assign(new Error("You are not authorized to review this booking"), { statusCode: 403 });
  }

  // One review per booking
  if (booking.review) {
    throw Object.assign(new Error("You have already reviewed this booking"), { statusCode: 409 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId: dto.bookingId,
      authorId: userId,
      providerId: booking.providerId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
    },
    include: {
      author: { select: { id: true, name: true } },
      provider: { select: { id: true, businessName: true } },
    },
  });

  // Re-calculate provider average rating & review count
  await syncProviderRating(booking.providerId);

  // Send in-app notification to provider
  try {
    const serviceName = booking.lead?.eventService?.category?.name || "service";
    await prisma.notification.create({
      data: {
        userId: booking.provider.userId,
        type: "REVIEW",
        title: "New Review Received! ⭐",
        body: `You received a ${dto.rating}-star review for your ${serviceName} booking.`,
      },
    });
  } catch (nErr) {
    console.warn("Failed to create review notification:", nErr);
  }

  return review;
}

// ─── Update Review ────────────────────────────────────────────────────────────

export async function updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  if (review.authorId !== userId) {
    throw Object.assign(new Error("You can only edit your own reviews"), { statusCode: 403 });
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: dto.rating ?? review.rating,
      comment: dto.comment !== undefined ? dto.comment.trim() || null : review.comment,
    },
    include: {
      author: { select: { id: true, name: true } },
      provider: { select: { id: true, businessName: true } },
    },
  });

  if (dto.rating !== undefined && dto.rating !== review.rating) {
    await syncProviderRating(review.providerId);
  }

  return updated;
}

// ─── Delete Review ────────────────────────────────────────────────────────────

export async function deleteReview(userId: string, userRole: string, reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw Object.assign(new Error("Review not found"), { statusCode: 404 });
  }

  if (review.authorId !== userId && userRole !== "ADMIN") {
    throw Object.assign(new Error("You do not have permission to delete this review"), { statusCode: 403 });
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  await syncProviderRating(review.providerId);

  return { message: "Review deleted successfully" };
}

// ─── Get Provider Reviews (Public / Customer / Provider) ──────────────────────

export async function getProviderReviews(providerId: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, businessName: true, ratingAvg: true, ratingCount: true },
  });

  if (!provider) {
    throw Object.assign(new Error("Provider not found"), { statusCode: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      booking: {
        select: {
          id: true,
          confirmedAt: true,
          lead: {
            select: {
              eventService: {
                select: {
                  category: { select: { id: true, name: true, icon: true } },
                  event: { select: { id: true, title: true, type: true, eventDate: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    breakdown[star] = (breakdown[star] || 0) + 1;
    sum += r.rating;
  }

  const total = reviews.length;
  const averageRating = total > 0 ? Number((sum / total).toFixed(2)) : 0;

  return {
    provider,
    stats: {
      total,
      averageRating,
      breakdown,
    },
    reviews,
  };
}

// ─── Get Reviews Authored by Current User (Customer) ──────────────────────────

export async function getMyReviews(userId: string) {
  return prisma.review.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      provider: {
        select: {
          id: true,
          businessName: true,
          user: { select: { id: true, name: true } },
        },
      },
      booking: {
        select: {
          id: true,
          lead: {
            select: {
              eventService: {
                select: {
                  category: { select: { id: true, name: true, icon: true } },
                  event: { select: { id: true, title: true, type: true, eventDate: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

// ─── Get Reviews Received by Current User (Provider) ──────────────────────────

export async function getProviderReceivedReviews(userId: string) {
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!provider) {
    throw Object.assign(new Error("Provider profile not found"), { statusCode: 404 });
  }

  return getProviderReviews(provider.id);
}

// ─── Get Review for Specific Booking ──────────────────────────────────────────

export async function getBookingReview(bookingId: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      review: {
        include: {
          author: { select: { id: true, name: true } },
          provider: { select: { id: true, businessName: true } },
        },
      },
      provider: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { statusCode: 404 });
  }

  const isCustomer = booking.customerId === userId;
  const isProvider = booking.provider.userId === userId;
  const isAdmin = role === "ADMIN";

  if (!isCustomer && !isProvider && !isAdmin) {
    throw Object.assign(new Error("Access denied"), { statusCode: 403 });
  }

  return booking.review;
}
