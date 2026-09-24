import { prisma } from "../../lib/prisma.js";
import type { CreateEventDto, UpdateEventDto, AddServiceDto } from "./events.schema.js";
import { distributeLeadsForEvent, distributeLeadsForService } from "../leads/leads.service.js";

// ─── List customer's own events ───────────────────────────────────────────────

export async function listEvents(customerId: string) {
  const events = await prisma.event.findMany({
    where: { customerId },
    orderBy: { eventDate: "asc" },
    include: {
      services: {
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      },
      _count: { select: { guests: true } },
    },
  });
  return events;
}

// ─── Get single event (must belong to caller or be ADMIN) ─────────────────────

export async function getEvent(eventId: string, callerId: string, callerRole: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      services: {
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
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
                  review: true,
                },
              },
              providers: {
                select: { id: true, status: true },
              },
            },
          },
        },
      },
      guests: true,
      _count: { select: { guests: true } },
    },
  });

  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });

  if (callerRole !== "ADMIN" && event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return event;
}

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createEvent(customerId: string, dto: CreateEventDto) {
  const { serviceCategories, ...fields } = dto;

  const event = await prisma.event.create({
    data: {
      customerId,
      type: fields.type,
      title: fields.title,
      eventDate: new Date(fields.eventDate),
      startTime: fields.startTime,
      endTime: fields.endTime,
      timezone: fields.timezone,
      location: fields.location,
      latitude: fields.latitude ? String(fields.latitude) : undefined,
      longitude: fields.longitude ? String(fields.longitude) : undefined,
      guestCount: fields.guestCount,
      budgetMin: fields.budgetMin,
      budgetMax: fields.budgetMax,
      requirements: fields.requirements,
      status: "DRAFT",
      // attach services immediately if IDs provided
      services: serviceCategories?.length
        ? {
            create: serviceCategories.map((categoryId) => ({ categoryId })),
          }
        : undefined,
    },
    include: {
      services: {
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      },
      _count: { select: { guests: true } },
    },
  });

  // Automatically generate & match leads for requested services
  if (serviceCategories?.length) {
    try {
      await distributeLeadsForEvent(event.id);
    } catch (e) {
      console.warn("Could not distribute leads for event:", e);
    }
  }

  return event;
}

// ─── Update event ─────────────────────────────────────────────────────────────

export async function updateEvent(
  eventId: string,
  callerId: string,
  callerRole: string,
  dto: UpdateEventDto
) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && existing.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  const { serviceCategories, ...fields } = dto;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(fields.type && { type: fields.type }),
      ...(fields.title !== undefined && { title: fields.title }),
      ...(fields.eventDate && { eventDate: new Date(fields.eventDate) }),
      ...(fields.startTime !== undefined && { startTime: fields.startTime }),
      ...(fields.endTime !== undefined && { endTime: fields.endTime }),
      ...(fields.timezone && { timezone: fields.timezone }),
      ...(fields.location && { location: fields.location }),
      ...(fields.latitude !== undefined && { latitude: fields.latitude ? String(fields.latitude) : null }),
      ...(fields.longitude !== undefined && { longitude: fields.longitude ? String(fields.longitude) : null }),
      ...(fields.guestCount !== undefined && { guestCount: fields.guestCount }),
      ...(fields.budgetMin !== undefined && { budgetMin: fields.budgetMin }),
      ...(fields.budgetMax !== undefined && { budgetMax: fields.budgetMax }),
      ...(fields.requirements !== undefined && { requirements: fields.requirements }),
      ...(fields.status && { status: fields.status }),
    },
    include: {
      services: {
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      },
      _count: { select: { guests: true } },
    },
  });

  return updated;
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export async function deleteEvent(eventId: string, callerId: string, callerRole: string) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && existing.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  await prisma.event.delete({ where: { id: eventId } });
}

// ─── Add service to event ─────────────────────────────────────────────────────

export async function addService(
  eventId: string,
  callerId: string,
  callerRole: string,
  dto: AddServiceDto
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  // Verify category exists
  const category = await prisma.serviceCategory.findUnique({ where: { id: dto.categoryId } });
  if (!category) throw Object.assign(new Error("Service category not found"), { statusCode: 404 });

  // Upsert – ignore duplicate
  const existing = await prisma.eventService.findUnique({
    where: { eventId_categoryId: { eventId, categoryId: dto.categoryId } },
  });
  if (existing) {
    // update requirements if provided
    if (dto.requirements !== undefined) {
      return prisma.eventService.update({
        where: { id: existing.id },
        data: { requirements: dto.requirements },
        include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      });
    }
    return existing;
  }

  const created = await prisma.eventService.create({
    data: { eventId, categoryId: dto.categoryId, requirements: dto.requirements },
    include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
  });

  try {
    await distributeLeadsForService(created.id);
  } catch (e) {
    console.warn("Could not distribute lead for service:", e);
  }

  return created;
}

// ─── Remove service from event ────────────────────────────────────────────────

export async function removeService(
  eventId: string,
  categoryId: string,
  callerId: string,
  callerRole: string
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  const svc = await prisma.eventService.findUnique({
    where: { eventId_categoryId: { eventId, categoryId } },
  });
  if (!svc) throw Object.assign(new Error("Service not found on this event"), { statusCode: 404 });

  await prisma.eventService.delete({ where: { id: svc.id } });
}

// ─── List all service categories (public, for picker) ─────────────────────────

export async function listCategories() {
  return prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });
}
