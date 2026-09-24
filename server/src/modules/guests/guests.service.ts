import { prisma } from "../../lib/prisma.js";
import type {
  AddGuestDto,
  BulkAddGuestsDto,
  UpdateGuestDto,
  SendInvitationDto,
} from "./guests.schema.js";

// Helper to verify caller owns the event or is ADMIN
async function verifyEventOwner(eventId: string, callerId: string, callerRole: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  if (!event) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  if (callerRole !== "ADMIN" && event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return event;
}

// ─── List Guests ──────────────────────────────────────────────────────────────

export async function listGuests(eventId: string, callerId: string, callerRole: string) {
  const event = await verifyEventOwner(eventId, callerId, callerRole);

  const guests = await prisma.guest.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: guests.length,
    sent: guests.filter((g) => g.invitationStatus === "SENT").length,
    delivered: guests.filter((g) => g.invitationStatus === "DELIVERED").length,
    pending: guests.filter((g) => g.invitationStatus === "PENDING").length,
  };

  return { guests, stats, eventTitle: event.title, eventType: event.type };
}

// ─── Add Single Guest ─────────────────────────────────────────────────────────

export async function addGuest(
  eventId: string,
  callerId: string,
  callerRole: string,
  dto: AddGuestDto
) {
  await verifyEventOwner(eventId, callerId, callerRole);

  return prisma.guest.create({
    data: {
      eventId,
      name: dto.name,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      invitationStatus: "PENDING",
    },
  });
}

// ─── Bulk Add Guests ──────────────────────────────────────────────────────────

export async function bulkAddGuests(
  eventId: string,
  callerId: string,
  callerRole: string,
  dto: BulkAddGuestsDto
) {
  await verifyEventOwner(eventId, callerId, callerRole);

  const created = await prisma.$transaction(
    dto.guests.map((g) =>
      prisma.guest.create({
        data: {
          eventId,
          name: g.name,
          phone: g.phone ?? null,
          email: g.email ?? null,
          invitationStatus: "PENDING",
        },
      })
    )
  );

  return created;
}

// ─── Update Guest ─────────────────────────────────────────────────────────────

export async function updateGuest(
  guestId: string,
  callerId: string,
  callerRole: string,
  dto: UpdateGuestDto
) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true },
  });

  if (!guest) throw Object.assign(new Error("Guest not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && guest.event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return prisma.guest.update({
    where: { id: guestId },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.invitationStatus !== undefined && { invitationStatus: dto.invitationStatus }),
      ...(dto.invitationChannel !== undefined && { invitationChannel: dto.invitationChannel }),
    },
  });
}

// ─── Delete Guest ─────────────────────────────────────────────────────────────

export async function deleteGuest(guestId: string, callerId: string, callerRole: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true },
  });

  if (!guest) throw Object.assign(new Error("Guest not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && guest.event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  await prisma.guest.delete({ where: { id: guestId } });
}

// ─── Record Invitation Sent ───────────────────────────────────────────────────

export async function recordInvitationSent(
  guestId: string,
  callerId: string,
  callerRole: string,
  dto: SendInvitationDto
) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true },
  });

  if (!guest) throw Object.assign(new Error("Guest not found"), { statusCode: 404 });
  if (callerRole !== "ADMIN" && guest.event.customerId !== callerId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  return prisma.guest.update({
    where: { id: guestId },
    data: {
      invitationChannel: dto.channel,
      invitationStatus: "SENT",
      invitedAt: new Date(),
    },
  });
}

// ─── Public Digital Invitation Card ───────────────────────────────────────────

export async function getPublicInvitation(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      customer: { select: { name: true } },
    },
  });

  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });

  return {
    eventId: event.id,
    title: event.title,
    type: event.type,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    requirements: event.requirements,
    hostName: event.customer.name,
  };
}
