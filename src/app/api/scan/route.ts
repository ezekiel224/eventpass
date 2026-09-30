import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeRaffleAttendee } from "@/lib/raffle-attendee";
import { qrValidationSchema } from "@/lib/validation";
import { verifyQrPayload } from "@/services/qr";

export const dynamic = "force-dynamic";

const lookupSchema = z.object({
  eventId: z.string().min(3),
  attendeeId: z.string().optional(),
  fallbackCode: z.string().optional(),
  qrPayload: z.string().optional()
});

const allocationSchema = z.object({
  eventId: z.string().min(3),
  attendeeId: z.string().min(3),
  entries: z.array(z.object({ prizeId: z.string().min(3), ticketCount: z.coerce.number().int().min(0).max(10000) })).max(250)
});

function attendeeIdFromPayload(payload: string | undefined, eventId: string) {
  if (!payload) return undefined;
  try {
    const parsed = qrValidationSchema.safeParse(JSON.parse(payload));
    return parsed.success && parsed.data.eventId === eventId && verifyQrPayload(parsed.data) ? parsed.data.attendeeId : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const requestedEventId = request.nextUrl.searchParams.get("eventId") ?? "";
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { startsAt: "asc" },
    select: { id: true, name: true, startsAt: true }
  });
  const selectedEvent = events.find((event) => event.id === requestedEventId) ?? events[0] ?? null;
  const [prizes, attendees] = selectedEvent ? await Promise.all([
    prisma.rafflePrize.findMany({
      where: { eventId: selectedEvent.id, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, value: true }
    }),
    query.length >= 2 ? prisma.attendee.findMany({
      where: {
        eventId: selectedEvent.id,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { company: { contains: query } },
          { pass: { fallbackCode: { contains: query } } }
        ]
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
      select: { id: true, firstName: true, lastName: true, company: true, status: true, pass: { select: { fallbackCode: true } } }
    }) : Promise.resolve([])
  ]) : [[], []];

  return NextResponse.json({
    events: events.map((event) => ({ ...event, startsAt: event.startsAt.toISOString() })),
    selectedEventId: selectedEvent?.id ?? null,
    prizes,
    attendees: attendees.map((attendee) => ({
      id: attendee.id,
      name: `${attendee.firstName} ${attendee.lastName}`,
      location: attendee.company,
      status: attendee.status,
      fallbackCode: attendee.pass?.fallbackCode ?? null
    }))
  });
}

export async function POST(request: NextRequest) {
  const parsed = lookupSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Scan a pass or choose an attendee." }, { status: 400 });

  const attendeeId = parsed.data.attendeeId || attendeeIdFromPayload(parsed.data.qrPayload, parsed.data.eventId);
  const pass = parsed.data.fallbackCode ? await prisma.pass.findFirst({
    where: { OR: [{ fallbackCode: parsed.data.fallbackCode.trim() }, { id: parsed.data.fallbackCode.trim() }] }
  }) : null;
  const resolvedId = attendeeId || pass?.attendeeId;
  if (!resolvedId) return NextResponse.json({ error: "No matching pass was found." }, { status: 404 });

  const attendee = await prisma.attendee.findFirst({
    where: { id: resolvedId, eventId: parsed.data.eventId },
    include: { pass: true, raffleEntries: { where: { prize: { status: "ACTIVE" } } } }
  });
  if (!attendee) return NextResponse.json({ error: "This pass belongs to a different event." }, { status: 409 });
  return NextResponse.json({ attendee: serializeRaffleAttendee(attendee) });
}

export async function PUT(request: NextRequest) {
  const parsed = allocationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "The raffle ticket selection is invalid." }, { status: 400 });
  const uniquePrizeIds = new Set(parsed.data.entries.map((entry) => entry.prizeId));
  if (uniquePrizeIds.size !== parsed.data.entries.length) return NextResponse.json({ error: "Each prize can only appear once." }, { status: 400 });

  const result = await prisma.$transaction(async (transaction) => {
    const [attendee, prizes] = await Promise.all([
      transaction.attendee.findFirst({ where: { id: parsed.data.attendeeId, eventId: parsed.data.eventId } }),
      transaction.rafflePrize.findMany({ where: { eventId: parsed.data.eventId, status: "ACTIVE" }, select: { id: true } })
    ]);
    if (!attendee) return { error: "Attendee not found.", status: 404 as const };
    const activeIds = new Set(prizes.map((prize) => prize.id));
    if (parsed.data.entries.some((entry) => !activeIds.has(entry.prizeId))) return { error: "A prize is no longer available.", status: 409 as const };
    const total = parsed.data.entries.reduce((sum, entry) => sum + entry.ticketCount, 0);
    if (total > attendee.raffleTickets) return { error: `Only ${attendee.raffleTickets} tickets are available.`, status: 400 as const };

    await transaction.raffleEntry.deleteMany({ where: { attendeeId: attendee.id, prizeId: { in: [...activeIds] } } });
    const entries = parsed.data.entries.filter((entry) => entry.ticketCount > 0);
    if (entries.length) {
      await transaction.raffleEntry.createMany({
        data: entries.map((entry) => ({ attendeeId: attendee.id, prizeId: entry.prizeId, ticketCount: entry.ticketCount }))
      });
    }
    return { ok: true as const };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const attendee = await prisma.attendee.findUniqueOrThrow({
    where: { id: parsed.data.attendeeId },
    include: { pass: true, raffleEntries: { where: { prize: { status: "ACTIVE" } } } }
  });
  return NextResponse.json({ attendee: serializeRaffleAttendee(attendee) });
}
