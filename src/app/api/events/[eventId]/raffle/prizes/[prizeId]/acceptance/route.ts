import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { issuePrizeAcceptance } from "@/lib/prize-acceptance";

type Params = { params: Promise<{ eventId: string; prizeId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { eventId, prizeId } = await params;
  const prize = await prisma.rafflePrize.findFirst({
    where: { id: prizeId, eventId, status: "ACTIVE" },
    select: { id: true, winnerAttendeeId: true, acceptanceStatus: true }
  });

  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }
  if (!prize.winnerAttendeeId) {
    return NextResponse.json({ error: "Draw a final winner before requesting a signature." }, { status: 400 });
  }
  if (prize.acceptanceStatus === "SIGNED") {
    return NextResponse.json({ error: "This winner has already signed. The completed signature cannot be replaced." }, { status: 409 });
  }

  try {
    const acceptance = await issuePrizeAcceptance(prize.id, request.nextUrl.origin);
    return NextResponse.json({ acceptance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the signature request." }, { status: 500 });
  }
}
