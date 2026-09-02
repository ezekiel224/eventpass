import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashEmployeeNumber, normalizeEmployeeNumber, votingEmployeeIdSchema } from "@/lib/voting";

type Params = { params: Promise<{ ballotId: string; participantId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ballotId, participantId } = await params;
  const parsed = votingEmployeeIdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid employee ID." }, { status: 400 });
  }

  const participant = await prisma.votingParticipant.findFirst({
    where: { id: participantId, ballotId },
    select: { id: true, firstName: true, lastName: true }
  });
  if (!participant) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const employeeNumberHash = hashEmployeeNumber(normalizeEmployeeNumber(parsed.data.employeeNumber));
  const conflict = await prisma.votingParticipant.findUnique({
    where: { ballotId_employeeNumberHash: { ballotId, employeeNumberHash } },
    select: { id: true }
  });
  if (conflict && conflict.id !== participantId) {
    return NextResponse.json({ error: "That employee ID is already assigned to another person on this ballot." }, { status: 409 });
  }

  await prisma.votingParticipant.update({ where: { id: participantId }, data: { employeeNumberHash } });
  return NextResponse.json({ participant });
}

