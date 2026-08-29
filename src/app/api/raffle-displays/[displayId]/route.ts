import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RAFFLE_DISPLAY_MODES, serializeRaffleDisplay } from "@/lib/raffle-display";

type Params = { params: Promise<{ displayId: string }> };

const updateSchema = z.object({
  eventId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  mode: z.enum(RAFFLE_DISPLAY_MODES).optional(),
  paused: z.boolean().optional(),
  forcedPrizeId: z.string().nullable().optional(),
  rotationSeconds: z.number().int().min(6).max(60).optional()
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const { displayId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The display update is not valid." }, { status: 400 });

  const existing = await prisma.raffleDisplay.findUnique({ where: { id: displayId } });
  if (!existing) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  const eventId = parsed.data.eventId ?? existing.eventId;

  if (parsed.data.forcedPrizeId) {
    const prize = await prisma.rafflePrize.findFirst({ where: { id: parsed.data.forcedPrizeId, eventId, status: "ACTIVE" }, select: { id: true } });
    if (!prize) return NextResponse.json({ error: "That prize is not active for the selected event." }, { status: 400 });
  }

  const display = await prisma.raffleDisplay.update({
    where: { id: displayId },
    data: parsed.data,
    include: { event: { select: { name: true } } }
  });
  return NextResponse.json({ display: serializeRaffleDisplay(display) });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { displayId } = await params;
  const deleted = await prisma.raffleDisplay.deleteMany({ where: { id: displayId } });
  if (!deleted.count) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
