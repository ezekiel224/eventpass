import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const globalTicketSchema = z.object({
  raffleTickets: z.coerce.number().int().min(0).max(10000),
  mode: z.enum(["set", "add"]).default("set")
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = globalTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const attendees = await prisma.attendee.findMany({
    where: { eventId },
    include: { raffleEntries: { where: { prize: { status: "ACTIVE" } } } }
  });

  if (attendees.length === 0) {
    return NextResponse.json({ updated: 0, adjusted: 0 });
  }

  let adjusted = 0;
  await prisma.$transaction(attendees.map((attendee) => {
    const assignedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
    const requestedTickets = parsed.data.mode === "add"
      ? attendee.raffleTickets + parsed.data.raffleTickets
      : parsed.data.raffleTickets;
    const raffleTickets = Math.max(requestedTickets, assignedTickets);

    if (raffleTickets !== requestedTickets) {
      adjusted += 1;
    }

    return prisma.attendee.update({
      where: { id: attendee.id },
      data: { raffleTickets }
    });
  }));

  return NextResponse.json({
    updated: attendees.length,
    adjusted,
    mode: parsed.data.mode,
    raffleTickets: parsed.data.raffleTickets
  });
}
