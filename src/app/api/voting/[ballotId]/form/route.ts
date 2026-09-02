import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { votingFormSchema } from "@/lib/voting";

type Params = { params: Promise<{ ballotId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const parsed = votingFormSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Every question needs a prompt and at least two complete options." }, { status: 400 });
  const ballot = await prisma.votingBallot.findUnique({ where: { id: ballotId }, select: { status: true, _count: { select: { submissions: true } } } });
  if (!ballot) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });
  if (ballot._count.submissions) return NextResponse.json({ error: "The form cannot be restructured after voting has started. Close and duplicate the ballot for a new version." }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.votingQuestion.deleteMany({ where: { ballotId } });
    for (const [questionIndex, question] of parsed.data.questions.entries()) {
      await tx.votingQuestion.create({
        data: {
          ballotId,
          prompt: question.prompt,
          description: question.description || null,
          imageUrl: question.imageUrl || null,
          type: question.type,
          required: question.required,
          sortOrder: questionIndex,
          options: {
            create: question.options.map((option, optionIndex) => ({
              label: option.label,
              imageUrl: option.imageUrl || null,
              sortOrder: optionIndex
            }))
          }
        }
      });
    }
  });
  return NextResponse.json({ saved: true });
}
