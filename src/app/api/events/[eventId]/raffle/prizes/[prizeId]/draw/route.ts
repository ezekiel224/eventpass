import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; prizeId: string }> };

export const dynamic = "force-dynamic";

const drawSchema = z.object({
  override: z.boolean().default(false)
});

function attendeeName(attendee: { firstName: string; lastName: string }) {
  return `${attendee.firstName} ${attendee.lastName}`;
}

type DrawMetadata = {
  id: string;
  winnerName: string | null;
  winnerAttendeeId: string | null;
  drawnAt: Date | null;
  rerollCount: number;
};

type EventWinnerRow = DrawMetadata & {
  attendeeId: string | null;
  firstName: string | null;
  lastName: string | null;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { eventId, prizeId } = await params;
  const parsed = drawSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await prisma.$transaction(async (transaction) => {
    const prize = await transaction.rafflePrize.findFirst({
      where: { id: prizeId, eventId, status: "ACTIVE" },
      include: {
        entries: {
          where: { ticketCount: { gt: 0 } },
          include: { attendee: true }
        }
      }
    });

    if (!prize) {
      return { error: "Prize not found", status: 404 as const };
    }

    const [metadata] = await transaction.$queryRaw<DrawMetadata[]>`
      SELECT id, winnerName, winnerAttendeeId, drawnAt, rerollCount
      FROM RafflePrize
      WHERE id = ${prize.id}
    `;

    if (metadata.winnerName && !parsed.data.override) {
      return {
        error: `${metadata.winnerName} is the final winner. Use Override & reroll only if they are not present.`,
        status: 409 as const
      };
    }
    if (parsed.data.override && !metadata.winnerName) {
      return { error: "There is no winner to override. Run the initial draw first.", status: 400 as const };
    }

    const completedDraws = await transaction.$queryRaw<EventWinnerRow[]>`
      SELECT
        prize.id,
        prize.winnerName,
        prize.winnerAttendeeId,
        prize.drawnAt,
        prize.rerollCount,
        entry.attendeeId,
        attendee.firstName,
        attendee.lastName
      FROM RafflePrize AS prize
      LEFT JOIN RaffleEntry AS entry ON entry.prizeId = prize.id
      LEFT JOIN Attendee AS attendee ON attendee.id = entry.attendeeId
      WHERE prize.eventId = ${eventId} AND prize.winnerName IS NOT NULL
    `;

    // New draws persist attendee IDs. Names are used only to recover older winners
    // created before winnerAttendeeId was added.
    const excludedAttendeeIds = new Set<string>();
    for (const completedDraw of completedDraws) {
      if (completedDraw.winnerAttendeeId) {
        excludedAttendeeIds.add(completedDraw.winnerAttendeeId);
        continue;
      }
      if (completedDraw.attendeeId && completedDraw.firstName && completedDraw.lastName
        && `${completedDraw.firstName} ${completedDraw.lastName}` === completedDraw.winnerName) {
        excludedAttendeeIds.add(completedDraw.attendeeId);
      }
    }

    const eligibleEntries = prize.entries.filter((entry) => !excludedAttendeeIds.has(entry.attendeeId));
    const totalEligibleTickets = eligibleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
    if (prize.entries.length === 0) {
      return { error: "No tickets have been entered for this prize.", status: 400 as const };
    }
    if (totalEligibleTickets === 0) {
      return { error: "No eligible attendees remain for this prize. Existing event winners cannot win again.", status: 400 as const };
    }

    let target = Math.floor(Math.random() * totalEligibleTickets) + 1;
    const winnerEntry = eligibleEntries.find((entry) => {
      target -= entry.ticketCount;
      return target <= 0;
    }) ?? eligibleEntries[0];
    const winnerName = attendeeName(winnerEntry.attendee);
    const drawnAt = new Date();
    const nextRerollCount = metadata.rerollCount + (parsed.data.override ? 1 : 0);
    const updatedRows = parsed.data.override
      ? await transaction.$executeRaw`
          UPDATE RafflePrize
          SET winnerName = ${winnerName}, winnerAttendeeId = ${winnerEntry.attendeeId}, drawnAt = ${drawnAt}, rerollCount = ${nextRerollCount}, updatedAt = ${drawnAt}
          WHERE id = ${prize.id} AND winnerName = ${metadata.winnerName} AND drawnAt = ${metadata.drawnAt}
        `
      : await transaction.$executeRaw`
          UPDATE RafflePrize
          SET winnerName = ${winnerName}, winnerAttendeeId = ${winnerEntry.attendeeId}, drawnAt = ${drawnAt}, rerollCount = ${nextRerollCount}, updatedAt = ${drawnAt}
          WHERE id = ${prize.id} AND winnerName IS NULL
        `;
    if (updatedRows !== 1) {
      return { error: "This prize changed during the draw. Refresh to see the final winner.", status: 409 as const };
    }

    return {
      prize: {
        id: prize.id,
        name: prize.name,
        totalTickets: prize.entries.reduce((sum, entry) => sum + entry.ticketCount, 0),
        eligibleTickets: totalEligibleTickets,
        rerollCount: nextRerollCount
      },
      winner: {
        attendeeId: winnerEntry.attendee.id,
        name: winnerName,
        email: winnerEntry.attendee.email,
        ticketCount: winnerEntry.ticketCount
      },
      overriddenWinner: parsed.data.override ? metadata.winnerName : null,
      drawnAt: drawnAt.toISOString()
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
