import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    select: {
      firstName: true,
      lastName: true,
      company: true,
      ticketTier: true,
      vip: true,
      plusOneEnabled: true,
      plusOneFirstName: true,
      plusOneLastName: true,
      under21: true,
      plusOneUnder21: true,
      raffleTickets: true,
      pass: { select: { id: true } },
      raffleEntries: {
        where: { prize: { status: "ACTIVE" } },
        select: { ticketCount: true }
      }
    }
  });

  if (!attendee?.pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const usedTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
  const companionName = attendee.plusOneEnabled
    ? `${attendee.plusOneFirstName ?? ""} ${attendee.plusOneLastName ?? ""}`.trim() || null
    : null;
  return NextResponse.json(
    {
      remainingTickets: Math.max(0, attendee.raffleTickets - usedTickets),
      attendeeName: `${attendee.firstName} ${attendee.lastName}`.trim(),
      company: attendee.company,
      passType: attendee.vip ? "VIP" : attendee.ticketTier,
      accessLevel: attendee.ticketTier || null,
      companionName,
      under21Alert: attendee.under21 || attendee.plusOneUnder21
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
