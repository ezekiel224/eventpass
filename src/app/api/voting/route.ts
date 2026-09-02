import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createVotingSlug, votingBallotCreateSchema } from "@/lib/voting";

export const dynamic = "force-dynamic";

const ballotInclude = {
  event: { select: { id: true, name: true } },
  questions: {
    orderBy: { sortOrder: "asc" as const },
    include: { options: { orderBy: { sortOrder: "asc" as const }, include: { _count: { select: { answers: true } } } } }
  },
  _count: { select: { participants: true, submissions: true } }
};

export async function GET() {
  const [ballots, events] = await Promise.all([
    prisma.votingBallot.findMany({ include: ballotInclude, orderBy: { updatedAt: "desc" } }),
    prisma.event.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { startsAt: "asc" } })
  ]);
  return NextResponse.json({ ballots, events });
}

export async function POST(request: NextRequest) {
  const parsed = votingBallotCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the event, title, description, and image." }, { status: 400 });
  const event = await prisma.event.findFirst({ where: { id: parsed.data.eventId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const ballot = await prisma.votingBallot.create({
    data: {
      eventId: parsed.data.eventId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      confirmationMessage: parsed.data.confirmationMessage || null,
      slug: createVotingSlug(parsed.data.title)
    },
    include: ballotInclude
  });
  return NextResponse.json({ ballot }, { status: 201 });
}
