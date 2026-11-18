import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RAFFLE_CONFETTI_PRESETS, RAFFLE_DISPLAY_MODES, serializeRaffleDisplay } from "@/lib/raffle-display";
import { authorizeApi } from "@/lib/authorization";

type Params = { params: Promise<{ displayId: string }> };

const updateSchema = z.object({
  eventId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  mode: z.enum(RAFFLE_DISPLAY_MODES).optional(),
  paused: z.boolean().optional(),
  forcedPrizeId: z.string().nullable().optional(),
  rotationSeconds: z.number().int().min(6).max(60).optional(),
  confettiPreset: z.enum(RAFFLE_CONFETTI_PRESETS).optional(),
  confettiColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(2).max(8).nullable().optional()
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await authorizeApi(request, "raffles:manage");
  if (!access.ok) return access.response;
  const { displayId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The display update is not valid." }, { status: 400 });

  const existing = await prisma.raffleDisplay.findFirst({ where: { id: displayId, event: { organizationId: access.authorization.organization.id } } });
  if (!existing) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  const eventId = parsed.data.eventId ?? existing.eventId;
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: access.authorization.organization.id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  if (parsed.data.forcedPrizeId) {
    const prize = await prisma.rafflePrize.findFirst({ where: { id: parsed.data.forcedPrizeId, eventId, status: "ACTIVE" }, select: { id: true } });
    if (!prize) return NextResponse.json({ error: "That prize is not active for the selected event." }, { status: 400 });
  }

  const display = await prisma.raffleDisplay.update({
    where: { id: displayId },
    data: {
      ...parsed.data,
      confettiColors: parsed.data.confettiColors === undefined
        ? undefined
        : parsed.data.confettiColors === null ? null : JSON.stringify(parsed.data.confettiColors)
    },
    include: { event: { select: { name: true } } }
  });
  return NextResponse.json({ display: serializeRaffleDisplay(display) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await authorizeApi(request, "raffles:manage");
  if (!access.ok) return access.response;
  const { displayId } = await params;
  const deleted = await prisma.raffleDisplay.deleteMany({ where: { id: displayId, event: { organizationId: access.authorization.organization.id } } });
  if (!deleted.count) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
