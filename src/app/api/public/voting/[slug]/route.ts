import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const ballot = await prisma.votingBallot.findFirst({
    where: { slug, status: "OPEN" },
    select: {
      id: true,
      title: true,
      description: true,
      coverImageUrl: true,
      confirmationMessage: true,
      event: { select: { name: true, venue: true, startsAt: true, logoUrl: true } },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          prompt: true,
          description: true,
          imageUrl: true,
          type: true,
          required: true,
          options: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, imageUrl: true } }
        }
      }
    }
  });
  if (!ballot) return NextResponse.json({ error: "This ballot is not currently open." }, { status: 404 });
  return NextResponse.json({ ballot });
}
