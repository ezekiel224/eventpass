import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DISPLAY_HEARTBEAT_WINDOW_MS, getRaffleDisplayContent, hashDisplaySecret, isRaffleDisplayMode } from "@/lib/raffle-display";

export const dynamic = "force-dynamic";

const heartbeatSchema = z.object({
  viewportWidth: z.number().int().min(1).max(32768).optional(),
  viewportHeight: z.number().int().min(1).max(32768).optional()
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Display pairing required." }, { status: 401 });
  const parsed = heartbeatSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid display heartbeat." }, { status: 400 });

  const tokenHash = hashDisplaySecret(token);
  const display = await prisma.raffleDisplay.findUnique({ where: { tokenHash } });
  if (!display) return NextResponse.json({ error: "This display is no longer paired." }, { status: 401 });

  const now = new Date();
  const updated = await prisma.raffleDisplay.update({
    where: { id: display.id },
    data: { lastSeenAt: now, ...parsed.data }
  });
  const activeDisplays = await prisma.raffleDisplay.findMany({
    where: {
      eventId: updated.eventId,
      mode: updated.mode,
      tokenHash: { not: null },
      lastSeenAt: { gte: new Date(now.getTime() - DISPLAY_HEARTBEAT_WINDOW_MS) }
    },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  const slotIndex = Math.max(0, activeDisplays.findIndex((candidate) => candidate.id === updated.id));
  const content = await getRaffleDisplayContent(updated.eventId);
  if (!content) return NextResponse.json({ error: "The assigned event no longer exists." }, { status: 404 });

  return NextResponse.json({
    serverNow: now.toISOString(),
    profile: {
      id: updated.id,
      name: updated.name,
      eventId: updated.eventId,
      mode: isRaffleDisplayMode(updated.mode) ? updated.mode : "WALL",
      paused: updated.paused,
      forcedPrizeId: updated.forcedPrizeId,
      rotationSeconds: updated.rotationSeconds
    },
    coordination: { slotIndex, displayCount: Math.max(1, activeDisplays.length) },
    content
  });
}
