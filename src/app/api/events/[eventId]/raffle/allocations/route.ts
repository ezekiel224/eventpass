import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeRaffleAttendee } from "@/app/api/events/[eventId]/raffle/route";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const allocationSchema = z.object({
  attendeeId: z.string().min(3),
  entries: z.array(z.object({
    prizeId: z.string().min(3),
    ticketCount: z.coerce.number().int().min(0).max(10000)
  })).max(250)
}).superRefine((value, context) => {
  const prizeIds = value.entries.map((entry) => entry.prizeId);
  if (new Set(prizeIds).size !== prizeIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Each prize can only appear once." });
  }
});

export async function PUT(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = allocationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await prisma.$transaction(async (transaction) => {
    const [attendee, activePrizes] = await Promise.all([
      transaction.attendee.findFirst({
        where: { id: parsed.data.attendeeId, eventId },
        include: { raffleEntries: { where: { prize: { status: "ACTIVE" } } } }
      }),
      transaction.rafflePrize.findMany({
        where: { eventId, status: "ACTIVE" },
        select: { id: true }
      })
    ]);

    if (!attendee) return { error: "Attendee not found", status: 404 as const };

    const activePrizeIds = new Set(activePrizes.map((prize) => prize.id));
    if (parsed.data.entries.some((entry) => !activePrizeIds.has(entry.prizeId))) {
      return { error: "One or more prizes are no longer available.", status: 400 as const };
    }

    const requestedTickets = parsed.data.entries.reduce((sum, entry) => sum + entry.ticketCount, 0);
    if (requestedTickets > attendee.raffleTickets) {
      return { error: `Only ${attendee.raffleTickets} tickets are available.`, status: 400 as const };
    }

    await transaction.raffleEntry.deleteMany({
      where: { attendeeId: attendee.id, prizeId: { in: [...activePrizeIds] } }
    });
    for (const entry of parsed.data.entries) {
      if (entry.ticketCount > 0) {
        await transaction.raffleEntry.create({
          data: { attendeeId: attendee.id, prizeId: entry.prizeId, ticketCount: entry.ticketCount }
        });
      }
    }

    return { ok: true as const };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const attendee = await prisma.attendee.findUniqueOrThrow({
    where: { id: parsed.data.attendeeId },
    include: { pass: true, raffleEntries: { where: { prize: { status: "ACTIVE" } } } }
  });
  return NextResponse.json({ attendee: serializeRaffleAttendee(attendee) });
}
