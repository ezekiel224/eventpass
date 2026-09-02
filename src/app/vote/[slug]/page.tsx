import { notFound } from "next/navigation";
import { PublicVotingForm } from "@/components/voting/public-voting-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ballot = await prisma.votingBallot.findFirst({
    where: { slug, status: "OPEN" },
    select: {
      title: true,
      description: true,
      coverImageUrl: true,
      confirmationMessage: true,
      event: { select: { name: true, venue: true } },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, prompt: true, description: true, imageUrl: true, type: true, required: true, options: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, imageUrl: true } } }
      }
    }
  });
  if (!ballot) notFound();
  return <PublicVotingForm slug={slug} ballot={{ ...ballot, questions: ballot.questions.map((question) => ({ ...question, type: question.type === "MULTIPLE" ? "MULTIPLE" as const : "SINGLE" as const })) }} />;
}
