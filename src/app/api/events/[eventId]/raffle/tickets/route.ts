import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const ticketSchema = z.object({
  attendeeId: z.string().min(3),
  raffleTickets: z.coerce.number().int().min(0).max(10000)
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = ticketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const attendee = await prisma.attendee.findFirst({
    where: {
      id: parsed.data.attendeeId,
      eventId
    },
    include: {
      raffleEntries: true
    }
  });

  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  const assignedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
  if (parsed.data.raffleTickets < assignedTickets) {
    return NextResponse.json({ error: `This guest already has ${assignedTickets} tickets assigned to prizes.` }, { status: 400 });
  }

  const updated = await prisma.attendee.update({
    where: { id: attendee.id },
    data: { raffleTickets: parsed.data.raffleTickets },
    include: {
      raffleEntries: true
    }
  });

  return NextResponse.json({
    attendee: {
      id: updated.id,
      raffleTickets: updated.raffleTickets,
      assignedTickets,
      remainingTickets: updated.raffleTickets - assignedTickets
    }
  });
}
