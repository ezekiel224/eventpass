import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { storedImageSchema } from "@/lib/image-schema";

type Params = { params: Promise<{ eventId: string; prizeId: string }> };

export const dynamic = "force-dynamic";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clearWinner") }),
  z.object({
    action: z.literal("updateDetails"),
    name: z.string().trim().min(2, "Enter a prize name.").max(120),
    description: z.string().trim().max(600).optional(),
    value: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a fair-market value with up to two decimal places."),
    imageUrl: storedImageSchema.optional()
  })
]);

export async function PATCH(request: Request, { params }: Params) {
  const { eventId, prizeId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid prize update." }, { status: 400 });
  }

  const prize = await prisma.rafflePrize.findFirst({
    where: { id: prizeId, eventId, status: "ACTIVE" },
    select: { id: true, winnerName: true }
  });

  if (!prize) {
    return NextResponse.json({ error: "Prize not found." }, { status: 404 });
  }

  if (parsed.data.action === "updateDetails") {
    const updated = await prisma.rafflePrize.update({
      where: { id: prize.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        value: parsed.data.value,
        imageUrl: parsed.data.imageUrl || null
      },
      select: {
        id: true,
        name: true,
        description: true,
        value: true,
        imageUrl: true
      }
    });

    return NextResponse.json({ prize: updated });
  }

  if (!prize.winnerName) {
    return NextResponse.json({ error: "This prize does not have a winner to clear." }, { status: 409 });
  }

  const cleared = await prisma.rafflePrize.updateMany({
    where: { id: prize.id, eventId, status: "ACTIVE", winnerName: prize.winnerName },
    data: {
      winnerName: null,
      winnerAttendeeId: null,
      drawnAt: null,
      rerollCount: 0,
      acceptanceStatus: "NOT_SENT",
      acceptanceTokenHash: null,
      acceptanceExpiresAt: null,
      acceptanceSignerName: null,
      acceptanceSapId: null,
      taxAcknowledged: false,
      signatureDataUrl: null,
      acceptedAt: null,
      acceptedIp: null,
      acceptedUserAgent: null
    }
  });

  if (cleared.count === 0) {
    return NextResponse.json({ error: "The winner changed before it could be cleared. Refresh and try again." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, clearedWinner: prize.winnerName });
}

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
