import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  attendeeId: z.string().min(3),
  prizeId: z.string().min(3),
  ticketCount: z.coerce.number().int().min(0).max(10000)
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = entrySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [attendee, prize] = await Promise.all([
    prisma.attendee.findFirst({
      where: {
        id: parsed.data.attendeeId,
        eventId
      },
      include: {
        raffleEntries: true
      }
    }),
    prisma.rafflePrize.findFirst({
      where: {
        id: parsed.data.prizeId,
        eventId,
        status: "ACTIVE"
      }
    })
  ]);

  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  const assignedElsewhere = attendee.raffleEntries
    .filter((entry) => entry.prizeId !== prize.id)
    .reduce((sum, entry) => sum + entry.ticketCount, 0);
  const requestedTotal = assignedElsewhere + parsed.data.ticketCount;

  if (requestedTotal > attendee.raffleTickets) {
    return NextResponse.json({ error: `Only ${attendee.raffleTickets - assignedElsewhere} tickets remain for this guest.` }, { status: 400 });
  }

  if (parsed.data.ticketCount === 0) {
    await prisma.raffleEntry.deleteMany({
      where: {
        attendeeId: attendee.id,
        prizeId: prize.id
      }
    });
  } else {
    await prisma.raffleEntry.upsert({
      where: {
        prizeId_attendeeId: {
          prizeId: prize.id,
          attendeeId: attendee.id
        }
      },
      update: {
        ticketCount: parsed.data.ticketCount
      },
      create: {
        prizeId: prize.id,
        attendeeId: attendee.id,
        ticketCount: parsed.data.ticketCount
      }
    });
  }

  return NextResponse.json({ ok: true });
}
