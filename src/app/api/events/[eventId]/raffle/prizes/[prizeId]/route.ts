import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ eventId: string; prizeId: string }> };

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: Params) {
  const { eventId, prizeId } = await params;
  const prize = await prisma.rafflePrize.findFirst({ where: { id: prizeId, eventId } });

  if (!prize) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  await prisma.rafflePrize.update({
    where: { id: prizeId },
    data: { status: "ARCHIVED" }
  });

  return NextResponse.json({ ok: true });
}
