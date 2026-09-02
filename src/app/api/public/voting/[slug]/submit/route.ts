import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestIp, verifyVotingVerificationToken, votingSubmissionSchema } from "@/lib/voting";
import { rateLimit } from "@/services/rate-limit";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const limited = rateLimit(`vote-submit:${slug}:${requestIp(request) ?? "local"}`, 15, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many submission attempts. Wait a moment and try again." }, { status: 429 });
  const parsed = votingSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review every required question before submitting." }, { status: 400 });
  const verification = verifyVotingVerificationToken(parsed.data.verificationToken);
  if (!verification) return NextResponse.json({ error: "Your employee verification expired. Enter your employee ID again." }, { status: 401 });

  const ballot = await prisma.votingBallot.findFirst({
    where: { id: verification.ballotId, slug, status: "OPEN" },
    include: { questions: { include: { options: { select: { id: true } } } } }
  });
  if (!ballot) return NextResponse.json({ error: "This ballot is no longer open." }, { status: 409 });
  const participant = await prisma.votingParticipant.findFirst({ where: { id: verification.participantId, ballotId: ballot.id }, select: { id: true, submission: { select: { id: true } } } });
  if (!participant) return NextResponse.json({ error: "Employee verification is no longer valid." }, { status: 401 });
  if (participant.submission) return NextResponse.json({ error: "A vote has already been submitted for this employee ID." }, { status: 409 });

  const submitted = new Map(parsed.data.answers.map((answer) => [answer.questionId, [...new Set(answer.optionIds)]]));
  const answerRows: Array<{ questionId: string; optionId: string }> = [];
  for (const question of ballot.questions) {
    const optionIds = submitted.get(question.id) ?? [];
    if (question.required && !optionIds.length) return NextResponse.json({ error: `Answer the required question: ${question.prompt}` }, { status: 400 });
    if (question.type === "SINGLE" && optionIds.length > 1) return NextResponse.json({ error: `${question.prompt} accepts one selection.` }, { status: 400 });
    const allowed = new Set(question.options.map((option) => option.id));
    if (optionIds.some((optionId) => !allowed.has(optionId))) return NextResponse.json({ error: "One or more selections are not valid for this ballot." }, { status: 400 });
    answerRows.push(...optionIds.map((optionId) => ({ questionId: question.id, optionId })));
  }
  if ([...submitted.keys()].some((questionId) => !ballot.questions.some((question) => question.id === questionId))) return NextResponse.json({ error: "The ballot changed. Refresh and try again." }, { status: 409 });

  try {
    await prisma.votingSubmission.create({
      data: {
        ballotId: ballot.id,
        participantId: participant.id,
        ipAddress: requestIp(request),
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        answers: { create: answerRows }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "A vote has already been submitted for this employee ID." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ submitted: true, confirmationMessage: ballot.confirmationMessage });
}
