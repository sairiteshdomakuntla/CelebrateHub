import { prisma } from "../../lib/prisma.js";
import type { AcceptLeadDto, DeclineLeadDto } from "./leads.schema.js";

// Helper to get or verify a provider for a given user
async function getProviderForUser(userId: string) {
  let provider = await prisma.provider.findUnique({
    where: { userId },
  });

  if (!provider) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "PROVIDER") {
      throw Object.assign(new Error("Provider profile not found"), { statusCode: 404 });
    }
    provider = await prisma.provider.create({
      data: {
        userId,
        businessName: user.name || "My Business",
        isAvailable: true,
      },
    });
  }

  return provider;
}

// ─── Lead Generation & Matching ───────────────────────────────────────────────

export async function distributeLeadsForService(eventServiceId: string) {
  const service = await prisma.eventService.findUnique({
    where: { id: eventServiceId },
    include: {
      event: {
        include: { customer: { select: { id: true, name: true, phone: true } } },
      },
      category: { select: { id: true, name: true, slug: true, icon: true } },
    },
  });

  if (!service) return null;

  // 1. Ensure Lead record exists
  const lead = await prisma.lead.upsert({
    where: { eventServiceId: service.id },
    create: {
      eventServiceId: service.id,
      status: "PENDING",
      expiresAt: service.event.eventDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  if (lead.status !== "PENDING") {
    return lead; // Already accepted, expired or cancelled
  }

  // 2. Find eligible providers offering this category
  const eligibleProviders = await prisma.provider.findMany({
    where: {
      isAvailable: true,
      user: { status: "ACTIVE" },
      categories: {
        some: { categoryId: service.categoryId },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      availability: true,
    },
  });

  // 3. Match top providers based on configured MAX_PROVIDERS_PER_LEAD setting
  let maxProviders = 5;
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "MAX_PROVIDERS_PER_LEAD" },
    });
    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) maxProviders = parsed;
    }
  } catch {
    // fallback to 5
  }

  const targetedProviders = eligibleProviders.slice(0, maxProviders);

  for (const provider of targetedProviders) {
    // Upsert LeadProvider
    const existingLp = await prisma.leadProvider.findUnique({
      where: {
        leadId_providerId: {
          leadId: lead.id,
          providerId: provider.id,
        },
      },
    });

    if (!existingLp) {
      await prisma.leadProvider.create({
        data: {
          leadId: lead.id,
          providerId: provider.id,
          status: "PENDING",
          notifiedAt: new Date(),
        },
      });

      // Send in-app notification to provider
      try {
        await prisma.notification.create({
          data: {
            userId: provider.userId,
            type: "LEAD",
            title: `New Lead: ${service.category.name}`,
            body: `Celebration request for ${service.event.title || service.event.type} in ${service.event.location}. Tap to review and accept!`,
          },
        });
      } catch (err) {
        console.warn("Could not create lead notification:", err);
      }
    }
  }

  return lead;
}

export async function distributeLeadsForEvent(eventId: string) {
  const services = await prisma.eventService.findMany({
    where: { eventId },
    select: { id: true },
  });

  const results = [];
  for (const svc of services) {
    const lead = await distributeLeadsForService(svc.id);
    if (lead) results.push(lead);
  }
  return results;
}

// Ensure all existing event services in DB have leads generated & distributed
export async function syncAllPendingLeads() {
  const services = await prisma.eventService.findMany({
    where: {
      lead: null,
    },
    select: { id: true },
  });

  for (const s of services) {
    await distributeLeadsForService(s.id);
  }
}

// ─── Provider Lead Endpoints ──────────────────────────────────────────────────

export async function getProviderLeads(
  userId: string,
  tab: "available" | "accepted" | "history" = "available"
) {
  const provider = await getProviderForUser(userId);

  // Sync any orphaned services so provider gets latest available leads
  await syncAllPendingLeads();

  // If provider has categories, make sure any existing leads for those categories are distributed to them
  const providerCategories = await prisma.providerCategory.findMany({
    where: { providerId: provider.id },
    select: { categoryId: true },
  });

  if (providerCategories.length > 0) {
    const categoryIds = providerCategories.map((c) => c.categoryId);
    const unlinkedServices = await prisma.eventService.findMany({
      where: {
        categoryId: { in: categoryIds },
        lead: {
          status: "PENDING",
          providers: {
            none: { providerId: provider.id },
          },
        },
      },
      select: { id: true },
    });

    for (const svc of unlinkedServices) {
      await distributeLeadsForService(svc.id);
    }
  }

  let statusFilter: any;
  if (tab === "available") {
    statusFilter = {
      providerId: provider.id,
      status: { in: ["PENDING", "VIEWED"] },
      lead: { status: "PENDING" },
    };
  } else if (tab === "accepted") {
    statusFilter = {
      providerId: provider.id,
      status: "ACCEPTED",
    };
  } else {
    // history: declined, expired, or lead accepted by someone else
    statusFilter = {
      providerId: provider.id,
      OR: [
        { status: { in: ["DECLINED", "EXPIRED"] } },
        {
          lead: {
            status: { in: ["ACCEPTED", "EXPIRED", "CANCELLED"] },
            acceptedProviderId: { not: provider.id },
          },
        },
      ],
    };
  }

  const leadProviders = await prisma.leadProvider.findMany({
    where: statusFilter,
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        include: {
          booking: {
            include: {
              customer: {
                select: { id: true, name: true, phone: true, email: true },
              },
            },
          },
          eventService: {
            include: {
              category: { select: { id: true, name: true, slug: true, icon: true } },
              event: {
                include: {
                  customer: { select: { id: true, name: true, phone: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return leadProviders.map((lp) => {
    const event = lp.lead.eventService.event;
    const category = lp.lead.eventService.category;
    const isAcceptedByMe = lp.status === "ACCEPTED";

    return {
      leadProviderId: lp.id,
      leadId: lp.lead.id,
      leadStatus: lp.lead.status,
      myStatus: lp.status,
      notifiedAt: lp.notifiedAt,
      viewedAt: lp.viewedAt,
      respondedAt: lp.respondedAt,
      createdAt: lp.createdAt,
      service: {
        id: lp.lead.eventService.id,
        category: category,
        requirements: lp.lead.eventService.requirements,
      },
      event: {
        id: event.id,
        title: event.title,
        type: event.type,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        guestCount: event.guestCount,
        budgetMin: event.budgetMin,
        budgetMax: event.budgetMax,
        requirements: event.requirements,
        status: event.status,
        customer: isAcceptedByMe
          ? event.customer
          : { id: event.customer.id, name: event.customer.name, phone: null },
      },
      booking: lp.lead.booking
        ? {
            id: lp.lead.booking.id,
            status: lp.lead.booking.status,
            agreedPrice: lp.lead.booking.agreedPrice,
            currency: lp.lead.booking.currency,
            confirmedAt: lp.lead.booking.confirmedAt,
            customer: lp.lead.booking.customer,
          }
        : null,
    };
  });
}

// ─── Provider Lead Stats (Badge counts) ───────────────────────────────────────

export async function getProviderLeadStats(userId: string) {
  const provider = await getProviderForUser(userId);

  const [availableCount, acceptedCount] = await Promise.all([
    prisma.leadProvider.count({
      where: {
        providerId: provider.id,
        status: { in: ["PENDING", "VIEWED"] },
        lead: { status: "PENDING" },
      },
    }),
    prisma.leadProvider.count({
      where: {
        providerId: provider.id,
        status: "ACCEPTED",
      },
    }),
  ]);

  return { availableCount, acceptedCount };
}

// ─── Single Lead Detail (and mark as viewed) ──────────────────────────────────

export async function getLeadDetail(leadId: string, userId: string) {
  const provider = await getProviderForUser(userId);

  const lp = await prisma.leadProvider.findUnique({
    where: {
      leadId_providerId: {
        leadId,
        providerId: provider.id,
      },
    },
    include: {
      lead: {
        include: {
          booking: {
            include: {
              customer: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
          eventService: {
            include: {
              category: true,
              event: {
                include: {
                  customer: { select: { id: true, name: true, phone: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lp) {
    throw Object.assign(new Error("Lead not found or not distributed to you"), { statusCode: 404 });
  }

  // Mark as VIEWED if pending
  if (lp.status === "PENDING") {
    await prisma.leadProvider.update({
      where: { id: lp.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    lp.status = "VIEWED";
    lp.viewedAt = new Date();
  }

  const isAccepted = lp.status === "ACCEPTED";
  const event = lp.lead.eventService.event;

  return {
    leadProviderId: lp.id,
    leadId: lp.lead.id,
    leadStatus: lp.lead.status,
    myStatus: lp.status,
    createdAt: lp.createdAt,
    service: {
      id: lp.lead.eventService.id,
      category: lp.lead.eventService.category,
      requirements: lp.lead.eventService.requirements,
    },
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      guestCount: event.guestCount,
      budgetMin: event.budgetMin,
      budgetMax: event.budgetMax,
      requirements: event.requirements,
      status: event.status,
      customer: isAccepted
        ? event.customer
        : { id: event.customer.id, name: event.customer.name, phone: null, email: null },
    },
    booking: lp.lead.booking,
  };
}

// ─── Accept Lead (First-come, first-served) ────────────────────────────────────

export async function acceptLead(leadId: string, userId: string, dto?: AcceptLeadDto) {
  const provider = await getProviderForUser(userId);

  return prisma.$transaction(async (tx) => {
    // 1. Check lead status
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      include: {
        eventService: {
          include: {
            category: true,
            event: {
              include: { customer: { select: { id: true, name: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!lead) {
      throw Object.assign(new Error("Lead not found"), { statusCode: 404 });
    }

    if (lead.status !== "PENDING") {
      throw Object.assign(
        new Error("This lead is no longer available. It has already been accepted by another provider."),
        { statusCode: 409 }
      );
    }

    // 2. Check provider's leadProvider record
    const lp = await tx.leadProvider.findUnique({
      where: {
        leadId_providerId: {
          leadId,
          providerId: provider.id,
        },
      },
    });

    if (!lp) {
      throw Object.assign(new Error("You were not invited to this lead"), { statusCode: 403 });
    }

    const now = new Date();

    // 3. Update Lead
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "ACCEPTED",
        acceptedProviderId: provider.id,
        acceptedAt: now,
      },
    });

    // 4. Update this LeadProvider to ACCEPTED
    await tx.leadProvider.update({
      where: { id: lp.id },
      data: {
        status: "ACCEPTED",
        respondedAt: now,
      },
    });

    // 5. Expire all other providers who received this lead
    await tx.leadProvider.updateMany({
      where: {
        leadId,
        providerId: { not: provider.id },
        status: { in: ["PENDING", "VIEWED"] },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // 6. Calculate Platform Commission & Create Booking
    let commissionRate = 10.0;
    try {
      const commSetting = await tx.platformSetting.findUnique({
        where: { key: "PLATFORM_COMMISSION_PCT" },
      });
      if (commSetting?.value) {
        const parsedRate = parseFloat(commSetting.value);
        if (!isNaN(parsedRate) && parsedRate >= 0) commissionRate = parsedRate;
      }
    } catch {
      // fallback to 10%
    }

    const agreedPrice = dto?.agreedPrice ?? provider.pricingMin ?? null;
    let commissionAmount: number | null = null;
    let payoutAmount: number | null = null;
    if (agreedPrice !== null) {
      commissionAmount = Math.round((agreedPrice * commissionRate) / 100);
      payoutAmount = agreedPrice - commissionAmount;
    }

    const booking = await tx.booking.create({
      data: {
        leadId: lead.id,
        customerId: lead.eventService.event.customerId,
        providerId: provider.id,
        status: "CONFIRMED",
        paymentStatus: "NOT_REQUIRED",
        agreedPrice,
        commissionRate,
        commissionAmount,
        payoutAmount,
        notes: dto?.notes,
        confirmedAt: now,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // 7. Create notification for customer
    try {
      await tx.notification.create({
        data: {
          userId: lead.eventService.event.customerId,
          type: "BOOKING",
          title: "Service Provider Confirmed!",
          body: `${provider.businessName} has accepted your request for ${lead.eventService.category.name} on ${lead.eventService.event.title || "your celebration"}.`,
        },
      });
    } catch (nErr) {
      console.warn("Customer notification failed:", nErr);
    }

    return {
      message: "Lead accepted successfully!",
      lead: updatedLead,
      booking,
    };
  });
}

// ─── Decline Lead ─────────────────────────────────────────────────────────────

export async function declineLead(leadId: string, userId: string, dto?: DeclineLeadDto) {
  const provider = await getProviderForUser(userId);

  const lp = await prisma.leadProvider.findUnique({
    where: {
      leadId_providerId: {
        leadId,
        providerId: provider.id,
      },
    },
  });

  if (!lp) {
    throw Object.assign(new Error("Lead not found or not distributed to you"), { statusCode: 404 });
  }

  await prisma.leadProvider.update({
    where: { id: lp.id },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
    },
  });

  return { message: "Lead declined" };
}

// ─── Customer: Get Leads & Booking Status for an Event ─────────────────────────

export async function getEventLeadsForCustomer(
  eventId: string,
  callerId: string,
  callerRole: string
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      services: {
        include: {
          category: true,
          lead: {
            include: {
              booking: {
                include: {
                  provider: {
                    select: {
                      id: true,
                      businessName: true,
                      serviceArea: true,
                      pricingMin: true,
                      pricingMax: true,
                      ratingAvg: true,
                      ratingCount: true,
                      user: { select: { name: true, phone: true, email: true } },
                    },
                  },
                },
              },
              providers: {
                select: { id: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return event.services.map((svc) => {
    const lead = svc.lead;
    const acceptedBooking = lead?.booking;
    return {
      serviceId: svc.id,
      category: svc.category,
      requirements: svc.requirements,
      leadStatus: lead?.status ?? "PENDING",
      matchedProvidersCount: lead?.providers.length ?? 0,
      booking: acceptedBooking
        ? {
            id: acceptedBooking.id,
            status: acceptedBooking.status,
            agreedPrice: acceptedBooking.agreedPrice,
            confirmedAt: acceptedBooking.confirmedAt,
            provider: {
              id: acceptedBooking.provider.id,
              businessName: acceptedBooking.provider.businessName,
              serviceArea: acceptedBooking.provider.serviceArea,
              phone: acceptedBooking.provider.user.phone,
              email: acceptedBooking.provider.user.email,
              ratingAvg: acceptedBooking.provider.ratingAvg,
              ratingCount: acceptedBooking.provider.ratingCount,
            },
          }
        : null,
    };
  });
}

// ─── Admin: List all leads across platform ────────────────────────────────────

export async function adminListLeads() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      eventService: {
        include: {
          category: true,
          event: {
            select: { id: true, title: true, type: true, eventDate: true, location: true },
          },
        },
      },
      booking: {
        include: {
          provider: { select: { id: true, businessName: true } },
          customer: { select: { id: true, name: true, email: true } },
        },
      },
      providers: {
        select: { id: true, providerId: true, status: true },
      },
    },
  });

  return leads;
}
