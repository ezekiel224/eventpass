import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { serializeRaffleAttendee } from "@/app/api/events/[eventId]/raffle/route";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

const scanSchema = z.object({
  attendeeId: z.string().optional(),
  fallbackCode: z.string().optional(),
  qrPayload: z.string().optional()
});

function attendeeIdFromPayload(payload: string | undefined) {
  if (!payload) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(payload);
    return typeof parsed.attendeeId === "string" ? parsed.attendeeId : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const parsed = scanSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const attendeeId = parsed.data.attendeeId || attendeeIdFromPayload(parsed.data.qrPayload);
  const pass = parsed.data.fallbackCode
    ? await prisma.pass.findUnique({ where: { fallbackCode: parsed.data.fallbackCode.trim() } })
    : null;
  const resolvedAttendeeId = attendeeId || pass?.attendeeId;

  if (!resolvedAttendeeId) {
    return NextResponse.json({ error: "Scan a pass, paste QR payload JSON, or enter a fallback code." }, { status: 400 });
  }

  const attendee = await prisma.attendee.findFirst({
    where: {
      id: resolvedAttendeeId,
      eventId
    },
    include: {
      pass: true,
      raffleEntries: true
    }
  });

  if (!attendee) {
    return NextResponse.json({ error: "Pass does not belong to the selected event." }, { status: 404 });
  }

  return NextResponse.json({ attendee: serializeRaffleAttendee(attendee) });
}
