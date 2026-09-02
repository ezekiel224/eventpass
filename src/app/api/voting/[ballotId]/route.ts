import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { votingBallotUpdateSchema } from "@/lib/voting";

type Params = { params: Promise<{ ballotId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const parsed = votingBallotUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The ballot settings are not valid." }, { status: 400 });
  const existing = await prisma.votingBallot.findUnique({ where: { id: ballotId }, include: { _count: { select: { questions: true, participants: true } } } });
  if (!existing) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });
  if (parsed.data.status === "OPEN" && (!existing._count.questions || !existing._count.participants)) {
    return NextResponse.json({ error: "Add at least one question and import the voter roster before opening voting." }, { status: 400 });
  }
  if (parsed.data.eventId) {
    const event = await prisma.event.findFirst({ where: { id: parsed.data.eventId, status: { not: "ARCHIVED" } }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const ballot = await prisma.votingBallot.update({
    where: { id: ballotId },
    data: {
      ...parsed.data,
      description: parsed.data.description === "" ? null : parsed.data.description,
      coverImageUrl: parsed.data.coverImageUrl === "" ? null : parsed.data.coverImageUrl,
      confirmationMessage: parsed.data.confirmationMessage === "" ? null : parsed.data.confirmationMessage
    }
  });
  return NextResponse.json({ ballot });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const existing = await prisma.votingBallot.findUnique({ where: { id: ballotId }, select: { _count: { select: { submissions: true } } } });
  if (!existing) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });
  if (existing._count.submissions) return NextResponse.json({ error: "Ballots with submitted votes cannot be deleted. Close voting instead." }, { status: 409 });
  await prisma.votingBallot.delete({ where: { id: ballotId } });
  return NextResponse.json({ deleted: true });
}
