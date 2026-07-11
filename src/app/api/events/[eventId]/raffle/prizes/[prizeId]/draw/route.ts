import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; prizeId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { eventId, prizeId } = await params;
  const prize = await prisma.rafflePrize.findFirst({
    where: {
      id: prizeId,
      eventId,
      status: "ACTIVE"
    },
    include: {
      entries: {
        where: {
          ticketCount: {
            gt: 0
          }
        },
        include: {
          attendee: true
        }
      }
    }
  });

  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  const totalTickets = prize.entries.reduce((sum, entry) => sum + entry.ticketCount, 0);
  if (totalTickets === 0) {
    return NextResponse.json({ error: "No tickets have been entered for this prize." }, { status: 400 });
  }

  let target = Math.floor(Math.random() * totalTickets) + 1;
  const winnerEntry = prize.entries.find((entry) => {
    target -= entry.ticketCount;
    return target <= 0;
  }) ?? prize.entries[0];

  return NextResponse.json({
    prize: {
      id: prize.id,
      name: prize.name,
      totalTickets
    },
    winner: {
      attendeeId: winnerEntry.attendee.id,
      name: `${winnerEntry.attendee.firstName} ${winnerEntry.attendee.lastName}`,
      email: winnerEntry.attendee.email,
      ticketCount: winnerEntry.ticketCount
    }
  });
}
