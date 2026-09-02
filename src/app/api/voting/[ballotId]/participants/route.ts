import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { foldForSearch } from "@/lib/text";
import { hashEmployeeNumber, normalizeEmployeeNumber, votingParticipantSchema } from "@/lib/voting";

type Params = { params: Promise<{ ballotId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const ballot = await prisma.votingBallot.findUnique({ where: { id: ballotId }, select: { id: true } });
  if (!ballot) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });

  const query = foldForSearch(request.nextUrl.searchParams.get("search") ?? "");
  const participants = await prisma.votingParticipant.findMany({
    where: { ballotId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      submission: { select: { submittedAt: true } }
    }
  });
  const matches = participants.filter((participant) => !query || foldForSearch(`${participant.firstName} ${participant.lastName}`).includes(query));
  return NextResponse.json({ participants: matches.slice(0, 40), total: matches.length });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const parsed = votingParticipantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Review the employee details." }, { status: 400 });
  }

  const ballot = await prisma.votingBallot.findUnique({ where: { id: ballotId }, select: { id: true } });
  if (!ballot) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });

  const employeeNumberHash = hashEmployeeNumber(normalizeEmployeeNumber(parsed.data.employeeNumber));
  const existing = await prisma.votingParticipant.findUnique({
    where: { ballotId_employeeNumberHash: { ballotId, employeeNumberHash } },
    select: { id: true }
  });
  const participant = await prisma.votingParticipant.upsert({
    where: { ballotId_employeeNumberHash: { ballotId, employeeNumberHash } },
    update: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    create: {
      ballotId,
      employeeNumberHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName
    },
    select: { id: true, firstName: true, lastName: true }
  });

  return NextResponse.json({ participant, created: !existing }, { status: existing ? 200 : 201 });
}
