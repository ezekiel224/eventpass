import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createVotingVerificationToken, hashEmployeeNumber, requestIp } from "@/lib/voting";
import { rateLimit } from "@/services/rate-limit";

type Params = { params: Promise<{ slug: string }> };
const lookupSchema = z.object({ employeeNumber: z.string().trim().min(1).max(80) });

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const limited = rateLimit(`vote-lookup:${slug}:${requestIp(request) ?? "local"}`, 30, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many lookup attempts. Wait a moment and try again." }, { status: 429 });
  const parsed = lookupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your employee ID number." }, { status: 400 });

  const ballot = await prisma.votingBallot.findFirst({ where: { slug, status: "OPEN" }, select: { id: true } });
  if (!ballot) return NextResponse.json({ error: "This ballot is not currently open." }, { status: 404 });
  const participant = await prisma.votingParticipant.findUnique({
    where: { ballotId_employeeNumberHash: { ballotId: ballot.id, employeeNumberHash: hashEmployeeNumber(parsed.data.employeeNumber) } },
    select: { id: true, firstName: true, lastName: true, submission: { select: { submittedAt: true } } }
  });
  if (!participant) return NextResponse.json({ error: "That employee ID was not found on this voting roster." }, { status: 404 });

  return NextResponse.json({
    employee: { firstName: participant.firstName, lastName: participant.lastName, name: `${participant.firstName} ${participant.lastName}` },
    alreadySubmitted: Boolean(participant.submission),
    submittedAt: participant.submission?.submittedAt.toISOString() ?? null,
    verificationToken: participant.submission ? null : createVotingVerificationToken(participant.id, ballot.id)
  });
}
