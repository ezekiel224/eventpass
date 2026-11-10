import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RAFFLE_CONFETTI_PRESETS, RAFFLE_DISPLAY_MODES, serializeRaffleDisplay } from "@/lib/raffle-display";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  mode: z.enum(RAFFLE_DISPLAY_MODES),
  rotationSeconds: z.number().int().min(6).max(60).default(12),
  confettiPreset: z.enum(RAFFLE_CONFETTI_PRESETS).default("BRAND"),
  confettiColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(2).max(8).optional()
});

export async function GET() {
  const [displays, events] = await Promise.all([
    prisma.raffleDisplay.findMany({
      include: { event: { select: { name: true } } },
      orderBy: [{ event: { startsAt: "asc" } }, { createdAt: "asc" }]
    }),
    prisma.event.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        rafflePrizes: {
          where: { status: "ACTIVE", drawnAt: null },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { startsAt: "asc" }
    })
  ]);
  return NextResponse.json({ displays: displays.map(serializeRaffleDisplay), events });
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the display name, event, mode, and timing." }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const display = await prisma.raffleDisplay.create({
    data: {
      ...parsed.data,
      confettiColors: parsed.data.confettiColors ? JSON.stringify(parsed.data.confettiColors) : null
    },
    include: { event: { select: { name: true } } }
  });

  return NextResponse.json({ display: serializeRaffleDisplay(display) }, { status: 201 });
}
