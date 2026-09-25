import { prisma } from "../../lib/prisma.js";
import {
  CreateGiftItemInput,
  UpdateGiftItemInput,
  ClaimGiftItemInput,
  CreateContributionInput,
} from "./gifts.schema.js";

// ─── Get Event Gift Circle & Overview ────────────────────────────────────────

export async function getEventGiftCircle(eventId: string, currentUserId?: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!event) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  const isHost = currentUserId ? event.customerId === currentUserId : false;

  const [items, contributions] = await Promise.all([
    prisma.giftItem.findMany({
      where: { eventId },
      orderBy: [
        { priority: "asc" }, // HIGH first if alphabetized, but we can do custom sort or priority
        { createdAt: "desc" },
      ],
      include: {
        _count: {
          select: { contributions: true },
        },
      },
    }),
    prisma.giftContribution.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: {
        giftItem: {
          select: { id: true, title: true, isGroupGift: true },
        },
      },
    }),
  ]);

  // Priority sorting: HIGH -> MEDIUM -> LOW
  const priorityOrder: Record<string, number> = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  items.sort((a, b) => {
    const pA = priorityOrder[a.priority] || 2;
    const pB = priorityOrder[b.priority] || 2;
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate rich statistics
  const totalItems = items.length;
  const claimedItems = items.filter((i) => i.status === "CLAIMED" || i.status === "COMPLETED").length;
  const availableItems = items.filter((i) => i.status === "AVAILABLE").length;
  const groupFundsCount = items.filter((i) => i.isGroupGift).length;

  const totalTargetAmount = items.reduce((sum, i) => sum + (i.targetAmount ?? 0), 0);
  const totalCollectedAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  const percentageFunded =
    totalTargetAmount > 0
      ? Math.min(100, Math.round((totalCollectedAmount / totalTargetAmount) * 100))
      : 0;

  // Mask anonymous contributors for non-host viewers
  const sanitizedContributions = contributions.map((c) => {
    if (c.isAnonymous && !isHost) {
      return {
        ...c,
        contributorName: "Generous Well-Wisher",
        contributorEmail: null,
        contributorPhone: null,
      };
    }
    return c;
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      eventDate: event.eventDate,
      location: event.location,
      customer: {
        id: event.customer.id,
        name: event.customer.name,
      },
    },
    isHost,
    stats: {
      totalItems,
      claimedItems,
      availableItems,
      groupFundsCount,
      totalTargetAmount,
      totalCollectedAmount,
      percentageFunded,
      contributionsCount: contributions.length,
    },
    items,
    contributions: sanitizedContributions,
  };
}

// ─── Add Registry / Wishlist Item ────────────────────────────────────────────

export async function addGiftItem(
  eventId: string,
  userId: string,
  data: CreateGiftItemInput
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { customerId: true },
  });

  if (!event) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  if (event.customerId !== userId) {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      throw Object.assign(new Error("Only the event host can add items to the registry"), {
        statusCode: 403,
      });
    }
  }

  const giftItem = await prisma.giftItem.create({
    data: {
      eventId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category || "GENERAL",
      imageUrl: data.imageUrl || null,
      externalUrl: data.externalUrl || null,
      targetAmount: data.targetAmount || null,
      isGroupGift: data.isGroupGift,
      priority: data.priority,
      status: "AVAILABLE",
    },
  });

  return giftItem;
}

// ─── Update Gift Item ────────────────────────────────────────────────────────

export async function updateGiftItem(
  itemId: string,
  userId: string,
  data: UpdateGiftItemInput
) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: { event: { select: { customerId: true } } },
  });

  if (!item) {
    throw Object.assign(new Error("Gift item not found"), { statusCode: 404 });
  }

  if (item.event.customerId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      throw Object.assign(new Error("Permission denied"), { statusCode: 403 });
    }
  }

  const updated = await prisma.giftItem.update({
    where: { id: itemId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl || null }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount || null }),
      ...(data.isGroupGift !== undefined && { isGroupGift: data.isGroupGift }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  return updated;
}

// ─── Delete Gift Item ────────────────────────────────────────────────────────

export async function deleteGiftItem(itemId: string, userId: string) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: { event: { select: { customerId: true } } },
  });

  if (!item) {
    throw Object.assign(new Error("Gift item not found"), { statusCode: 404 });
  }

  if (item.event.customerId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      throw Object.assign(new Error("Permission denied"), { statusCode: 403 });
    }
  }

  await prisma.giftItem.delete({
    where: { id: itemId },
  });

  return { success: true };
}

// ─── Claim Gift Item ─────────────────────────────────────────────────────────

export async function claimGiftItem(itemId: string, data: ClaimGiftItemInput) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          customerId: true,
        },
      },
    },
  });

  if (!item) {
    throw Object.assign(new Error("Gift item not found"), { statusCode: 404 });
  }

  if (item.status === "CLAIMED") {
    throw Object.assign(new Error("This gift has already been claimed by someone else"), {
      statusCode: 400,
    });
  }

  const updated = await prisma.giftItem.update({
    where: { id: itemId },
    data: {
      status: "CLAIMED",
      claimedBy: data.claimedBy.trim(),
      claimedAt: new Date(),
    },
  });

  // Notify host
  await prisma.notification.create({
    data: {
      userId: item.event.customerId,
      title: "🎁 Gift Claimed in Your Registry!",
      body: `${data.claimedBy.trim()} just promised to gift "${item.title}" for ${
        item.event.title || "your celebration"
      }!`,
      type: "EVENT",
    },
  });

  return updated;
}

// ─── Unclaim Gift Item ───────────────────────────────────────────────────────

export async function unclaimGiftItem(itemId: string, userId?: string) {
  const item = await prisma.giftItem.findUnique({
    where: { id: itemId },
    include: { event: { select: { customerId: true } } },
  });

  if (!item) {
    throw Object.assign(new Error("Gift item not found"), { statusCode: 404 });
  }

  const updated = await prisma.giftItem.update({
    where: { id: itemId },
    data: {
      status: "AVAILABLE",
      claimedBy: null,
      claimedAt: null,
    },
  });

  return updated;
}

// ─── Create Contribution / Cash Fund Blessing ────────────────────────────────

export async function createContribution(
  eventId: string,
  data: CreateContributionInput
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, customerId: true },
  });

  if (!event) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  let giftItem = null;
  if (data.giftItemId) {
    giftItem = await prisma.giftItem.findUnique({
      where: { id: data.giftItemId },
    });
  }

  // Create contribution record
  const contribution = await prisma.giftContribution.create({
    data: {
      eventId,
      giftItemId: data.giftItemId || null,
      contributorName: data.contributorName.trim(),
      contributorEmail: data.contributorEmail?.trim() || null,
      contributorPhone: data.contributorPhone?.trim() || null,
      amount: data.amount,
      message: data.message?.trim() || null,
      isAnonymous: data.isAnonymous,
      paymentStatus: "PAID",
      thanked: false,
    },
  });

  // If tied to a gift item, increment its collectedAmount
  if (giftItem) {
    const newCollected = giftItem.collectedAmount + data.amount;
    const isCompleted = giftItem.targetAmount ? newCollected >= giftItem.targetAmount : false;

    await prisma.giftItem.update({
      where: { id: giftItem.id },
      data: {
        collectedAmount: newCollected,
        ...(isCompleted && { status: "COMPLETED" }),
      },
    });
  }

  // Send festive notification to host
  const contributorDisplay = data.isAnonymous ? "A kind well-wisher" : data.contributorName.trim();
  const giftContext = giftItem ? `towards "${giftItem.title}"` : "to your Gift Circle";

  await prisma.notification.create({
    data: {
      userId: event.customerId,
      title: "🎉 New Gift Circle Contribution!",
      body: `${contributorDisplay} contributed ₹${data.amount.toLocaleString(
        "en-IN"
      )} ${giftContext}!${data.message ? ` "${data.message}"` : ""}`,
      type: "EVENT",
    },
  });

  return contribution;
}

// ─── Thank Contributor ───────────────────────────────────────────────────────

export async function thankContribution(contributionId: string, userId: string) {
  const contribution = await prisma.giftContribution.findUnique({
    where: { id: contributionId },
    include: { event: { select: { customerId: true } } },
  });

  if (!contribution) {
    throw Object.assign(new Error("Contribution not found"), { statusCode: 404 });
  }

  if (contribution.event.customerId !== userId) {
    throw Object.assign(new Error("Permission denied"), { statusCode: 403 });
  }

  const updated = await prisma.giftContribution.update({
    where: { id: contributionId },
    data: { thanked: true },
  });

  return updated;
}
