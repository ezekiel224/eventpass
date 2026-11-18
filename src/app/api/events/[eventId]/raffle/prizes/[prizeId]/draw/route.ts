import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issuePrizeAcceptance } from "@/lib/prize-acceptance";
import { authorizeEventApi } from "@/lib/authorization";
import { pickUniformWinner, pickWeightedWinner } from "@/lib/raffle-draw";

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
  const access = await authorizeEventApi(request, eventId, "raffles:manage");
  if (!access.ok) return access.response;
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
    const eligibleGuests = prize.entryMode === "ALL_GUESTS"
      ? await transaction.attendee.findMany({
          where: {
            eventId,
            status: "REGISTERED",
            id: { notIn: [...excludedAttendeeIds] }
          },
          orderBy: { id: "asc" }
        })
      : [];

    if (prize.entryMode === "TICKETS" && prize.entries.length === 0) {
      return { error: "No tickets have been entered for this prize.", status: 400 as const };
    }
    if (prize.entryMode === "TICKETS" && totalEligibleTickets === 0) {
      return { error: "No eligible attendees remain for this prize. Existing event winners cannot win again.", status: 400 as const };
    }
    if (prize.entryMode === "ALL_GUESTS" && eligibleGuests.length === 0) {
      return { error: "No eligible registered guests remain. Existing event winners cannot win again.", status: 400 as const };
    }

    const winnerEntry = prize.entryMode === "TICKETS" ? pickWeightedWinner(eligibleEntries) : null;
    const winnerAttendee = prize.entryMode === "ALL_GUESTS" ? pickUniformWinner(eligibleGuests) : winnerEntry?.attendee;
    if (!winnerAttendee) {
      return { error: "No eligible attendees remain for this prize.", status: 400 as const };
    }
    const winnerName = attendeeName(winnerAttendee);
    const drawnAt = new Date();
    const nextRerollCount = metadata.rerollCount + (parsed.data.override ? 1 : 0);
    const updatedRows = parsed.data.override
      ? await transaction.$executeRaw`
          UPDATE RafflePrize
          SET winnerName = ${winnerName}, winnerAttendeeId = ${winnerAttendee.id}, drawnAt = ${drawnAt}, rerollCount = ${nextRerollCount}, updatedAt = ${drawnAt},
              acceptanceStatus = 'NOT_SENT', acceptanceTokenHash = NULL, acceptanceExpiresAt = NULL,
              acceptanceSignerName = NULL, acceptanceSapId = NULL, taxAcknowledged = false,
              signatureDataUrl = NULL, acceptedAt = NULL, acceptedIp = NULL, acceptedUserAgent = NULL
          WHERE id = ${prize.id} AND winnerName = ${metadata.winnerName} AND drawnAt = ${metadata.drawnAt}
        `
      : await transaction.$executeRaw`
          UPDATE RafflePrize
          SET winnerName = ${winnerName}, winnerAttendeeId = ${winnerAttendee.id}, drawnAt = ${drawnAt}, rerollCount = ${nextRerollCount}, updatedAt = ${drawnAt},
              acceptanceStatus = 'NOT_SENT', acceptanceTokenHash = NULL, acceptanceExpiresAt = NULL,
              acceptanceSignerName = NULL, acceptanceSapId = NULL, taxAcknowledged = false,
              signatureDataUrl = NULL, acceptedAt = NULL, acceptedIp = NULL, acceptedUserAgent = NULL
          WHERE id = ${prize.id} AND winnerName IS NULL
        `;
    if (updatedRows !== 1) {
      return { error: "This prize changed during the draw. Refresh to see the final winner.", status: 409 as const };
    }

    return {
      prize: {
        id: prize.id,
        name: prize.name,
        entryMode: prize.entryMode,
        totalTickets: prize.entries.reduce((sum, entry) => sum + entry.ticketCount, 0),
        eligibleTickets: totalEligibleTickets,
        eligibleGuests: eligibleGuests.length,
        rerollCount: nextRerollCount
      },
      winner: {
        attendeeId: winnerAttendee.id,
        name: winnerName,
        email: winnerAttendee.email,
        ticketCount: winnerEntry?.ticketCount ?? null
      },
      overriddenWinner: parsed.data.override ? metadata.winnerName : null,
      drawnAt: drawnAt.toISOString()
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  let acceptance = null;
  try {
    acceptance = await issuePrizeAcceptance(result.prize.id, request);
  } catch (error) {
    console.error("Could not issue prize acceptance", error);
  }
  return NextResponse.json({ ...result, acceptance });
}
