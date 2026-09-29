import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicPassWhere } from "@/lib/public-pass";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { attendeeId } = await params;
  const pass = await prisma.pass.findFirst({ where: publicPassWhere(attendeeId) });
  const attendee = pass ? await prisma.attendee.findUnique({
    where: { id: pass.attendeeId },
    select: {
      raffleTickets: true,
      pass: { select: { id: true } },
      raffleEntries: {
        where: { prize: { status: "ACTIVE" } },
        select: { ticketCount: true }
      }
    }
  }) : null;

  if (!attendee?.pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const usedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
  return NextResponse.json(
    { remainingTickets: Math.max(0, attendee.raffleTickets - usedTickets) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
