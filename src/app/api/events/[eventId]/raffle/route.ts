import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const prizeSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(600).optional(),
  value: z.string().max(80).optional(),
  imageUrl: z.string().max(300000).optional()
});

function serializeRaffle(prizes: Awaited<ReturnType<typeof getPrizes>>, attendees: Awaited<ReturnType<typeof getAttendees>>, attendeeTotal: number) {
  const totalPrizeTickets = prizes.reduce((sum, prize) => sum + prize.entries.reduce((entrySum, entry) => entrySum + entry.ticketCount, 0), 0);
  const totalAllocatedTickets = attendees.reduce((sum, attendee) => sum + attendee.raffleTickets, 0);
  const totalAssignedTickets = attendees.reduce((sum, attendee) => sum + attendee.raffleEntries.reduce((entrySum, entry) => entrySum + entry.ticketCount, 0), 0);

  return {
    stats: {
      prizeCount: prizes.length,
      attendeeTotal,
      visibleAttendees: attendees.length,
      totalAllocatedTickets,
      totalAssignedTickets,
      totalPrizeTickets
    },
    prizes: prizes.map((prize) => ({
      id: prize.id,
      eventId: prize.eventId,
      name: prize.name,
      description: prize.description,
      value: prize.value,
      imageUrl: prize.imageUrl,
      status: prize.status,
      totalTickets: prize.entries.reduce((sum, entry) => sum + entry.ticketCount, 0),
      entries: prize.entries.map((entry) => ({
        id: entry.id,
        attendeeId: entry.attendeeId,
        attendeeName: `${entry.attendee.firstName} ${entry.attendee.lastName}`,
        ticketCount: entry.ticketCount
      }))
    })),
    attendees: attendees.map(serializeRaffleAttendee)
  };
}

export function serializeRaffleAttendee(attendee: Awaited<ReturnType<typeof getAttendees>>[number]) {
  const assignedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);

  return {
    id: attendee.id,
    name: `${attendee.firstName} ${attendee.lastName}`,
    email: attendee.email,
    company: attendee.company,
    eventId: attendee.eventId,
    raffleTickets: attendee.raffleTickets,
    assignedTickets,
    remainingTickets: attendee.raffleTickets - assignedTickets,
    entries: attendee.raffleEntries.map((entry) => ({
      prizeId: entry.prizeId,
      ticketCount: entry.ticketCount
    })),
    fallbackCode: attendee.pass?.fallbackCode ?? null
  };
}

async function getPrizes(eventId: string) {
  const prizes = await prisma.rafflePrize.findMany({
    where: { eventId, status: "ACTIVE" },
    include: {
      entries: {
        include: {
          attendee: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const imageRows = await prisma.$queryRaw<Array<{ id: string; imageUrl: string | null }>>`
    SELECT id, imageUrl FROM RafflePrize WHERE eventId = ${eventId}
  `;
  const imageUrls = new Map(imageRows.map((row) => [row.id, row.imageUrl]));

  return prizes.map((prize) => ({
    ...prize,
    imageUrl: imageUrls.get(prize.id) ?? null
  }));
}

function getAttendees(eventId: string, search = "", limit = 100) {
  const trimmed = search.trim();

  return prisma.attendee.findMany({
    where: {
      eventId,
      ...(trimmed ? {
        OR: [
          { firstName: { contains: trimmed } },
          { lastName: { contains: trimmed } },
          { email: { contains: trimmed } },
          { company: { contains: trimmed } }
        ]
      } : {})
    },
    include: {
      pass: true,
      raffleEntries: true
    },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" }
    ],
    take: limit
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 100), 1), 500);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [prizes, attendees, attendeeTotal] = await Promise.all([
    getPrizes(eventId),
    getAttendees(eventId, search, limit),
    prisma.attendee.count({ where: { eventId } })
  ]);
  return NextResponse.json({ raffle: serializeRaffle(prizes, attendees, attendeeTotal) });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = prizeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const prize = await prisma.rafflePrize.create({
    data: {
      eventId,
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      value: parsed.data.value || undefined
    }
  });
  if (parsed.data.imageUrl) {
    await prisma.$executeRaw`
      UPDATE RafflePrize SET imageUrl = ${parsed.data.imageUrl} WHERE id = ${prize.id}
    `;
  }

  const [prizes, attendees, attendeeTotal] = await Promise.all([
    getPrizes(eventId),
    getAttendees(eventId),
    prisma.attendee.count({ where: { eventId } })
  ]);
  return NextResponse.json({ raffle: serializeRaffle(prizes, attendees, attendeeTotal) }, { status: 201 });
}
