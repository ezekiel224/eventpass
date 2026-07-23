import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, createPassForAttendee, serializeAttendee, stringifyStringArray } from "@/lib/prisma-helpers";
import { attendeeRegistrationSchema } from "@/lib/validation";
import { rateLimit } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId") ?? undefined;
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const attendees = await prisma.attendee.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(includeArchived ? {} : { event: { status: { not: "ARCHIVED" } } })
    },
    include: attendeeInclude,
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ attendees: attendees.map(serializeAttendee) });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`attendees:${request.headers.get("x-forwarded-for") ?? "local"}`, 60);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attendee changes" }, { status: 429 });
  }

  const parsed = attendeeRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event || event.status === "ARCHIVED") {
    return NextResponse.json({ error: "Attendees cannot be added to an archived event" }, { status: 400 });
  }

  const attendee = await prisma.attendee.create({
    data: {
      eventId: parsed.data.eventId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      selectedAllergens: stringifyStringArray(parsed.data.selectedAllergens),
      plusOneEnabled: parsed.data.plusOneEnabled ?? false,
      plusOneFirstName: parsed.data.plusOneFirstName,
      plusOneLastName: parsed.data.plusOneLastName,
      plusOneAllergens: stringifyStringArray(parsed.data.plusOneAllergens),
      under21: parsed.data.under21 ?? false,
      plusOneUnder21: parsed.data.plusOneEnabled ? parsed.data.plusOneUnder21 ?? false : false,
      ticketTier: parsed.data.ticketTier ?? "General",
      seat: parsed.data.seat,
      notes: parsed.data.notes,
      vip: parsed.data.vip ?? false,
      customAnswers: parsed.data.customAnswers ? JSON.stringify(parsed.data.customAnswers) : undefined
    }
  });

  await createPassForAttendee(attendee.id, attendee.eventId);

  const created = await prisma.attendee.findUniqueOrThrow({
    where: { id: attendee.id },
    include: attendeeInclude
  });

  return NextResponse.json({ attendee: serializeAttendee(created) }, { status: 201 });
}
