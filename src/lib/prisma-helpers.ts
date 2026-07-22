import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AttendeeSummary, EventSummary } from "@/types/domain";

const eventInclude = {
  attendees: {
    include: {
      checkIns: true
    }
  }
} satisfies Prisma.EventInclude;

export async function getDefaultOrganization() {
  return prisma.organization.upsert({
    where: { id: "org_default" },
    update: {},
    create: {
      id: "org_default",
      name: "Northstar Labs"
    }
  });
}

export function parseStringArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyStringArray(values: string[] | undefined) {
  if (!values) {
    return undefined;
  }

  return JSON.stringify(values.map((value) => value.trim()).filter(Boolean));
}

export function serializeEvent(event: Prisma.EventGetPayload<{ include: typeof eventInclude }>): EventSummary {
  const attendeeCount = event.attendees.length;
  const checkedInCount = event.attendees.filter((attendee) => attendee.checkIns.some((checkIn) => !checkIn.duplicate)).length;

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    venue: event.venue,
    address: event.address,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    capacity: event.capacity,
    photoUrl: event.photoUrl,
    allergenOptions: parseStringArray(event.allergenOptions),
    organizer: event.organizer,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    passTheme: event.passTheme,
    status: event.status,
    registrationEnabled: event.registrationEnabled,
    qrPassesEnabled: event.qrPassesEnabled,
    emailConfirmationsEnabled: event.emailConfirmationsEnabled,
    waitlistEnabled: event.waitlistEnabled,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    attendeeCount,
    checkedInCount
  };
}

export function eventQueryInclude() {
  return eventInclude;
}

export const attendeeInclude = {
  event: true,
  pass: true,
  checkIns: {
    orderBy: {
      scannedAt: "desc"
    }
  }
} satisfies Prisma.AttendeeInclude;

export function serializeAttendee(attendee: Prisma.AttendeeGetPayload<{ include: typeof attendeeInclude }>): AttendeeSummary {
  const successfulCheckIn = attendee.checkIns.find((checkIn) => !checkIn.duplicate);

  return {
    id: attendee.id,
    eventId: attendee.eventId,
    eventName: attendee.event.name,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    name: `${attendee.firstName} ${attendee.lastName}`,
    email: attendee.email,
    phone: attendee.phone,
    company: attendee.company,
    birthDate: attendee.birthDate?.toISOString() ?? null,
    selectedAllergens: parseStringArray(attendee.selectedAllergens),
    plusOneEnabled: attendee.plusOneEnabled,
    plusOneFirstName: attendee.plusOneFirstName,
    plusOneLastName: attendee.plusOneLastName,
    plusOneName: attendee.plusOneFirstName && attendee.plusOneLastName ? `${attendee.plusOneFirstName} ${attendee.plusOneLastName}` : null,
    plusOneBirthDate: attendee.plusOneBirthDate?.toISOString() ?? null,
    plusOneAllergens: parseStringArray(attendee.plusOneAllergens),
    under21: attendee.under21,
    plusOneUnder21: attendee.plusOneUnder21,
    ticketTier: attendee.ticketTier,
    seat: attendee.seat,
    vip: attendee.vip,
    raffleTickets: attendee.raffleTickets,
    notes: attendee.notes,
    status: attendee.status,
    checkedIn: Boolean(successfulCheckIn),
    checkedInAt: successfulCheckIn?.scannedAt.toISOString() ?? null,
    passId: attendee.pass?.id ?? null,
    fallbackCode: attendee.pass?.fallbackCode ?? null,
    qrPayload: attendee.pass?.qrPayload ?? null
  };
}

export async function createPassForAttendee(attendeeId: string, eventId: string) {
  const { createQrPayload, tokenHash } = await import("@/services/qr");
  const payload = createQrPayload(attendeeId, eventId);
  const fallbackCode = `EP-${attendeeId.slice(-6).toUpperCase()}`;

  return prisma.pass.create({
    data: {
      attendeeId,
      fallbackCode,
      qrPayload: JSON.stringify(payload),
      tokenHash: tokenHash(payload.token)
    }
  });
}
