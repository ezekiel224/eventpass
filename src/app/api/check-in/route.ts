import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee } from "@/lib/prisma-helpers";
import { checkInSchema, qrValidationSchema } from "@/lib/validation";
import { verifyQrPayload } from "@/services/qr";
import { rateLimit } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkIns = await prisma.checkIn.findMany({
    orderBy: { scannedAt: "desc" },
    take: 20,
    include: {
      attendee: {
        include: attendeeInclude
      }
    }
  });

  return NextResponse.json({
    checkIns: checkIns.map((checkIn) => ({
      id: checkIn.id,
      duplicate: checkIn.duplicate,
      scannedAt: checkIn.scannedAt.toISOString(),
      attendee: serializeAttendee(checkIn.attendee)
    }))
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`checkin:${request.headers.get("x-forwarded-for") ?? "local"}`, 120);
  if (!limited.ok) {
    return NextResponse.json({ error: "Scanner rate limit exceeded" }, { status: 429 });
  }

  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let attendeeId = parsed.data.attendeeId;
  const rawPayload = parsed.data.qrPayload ?? parsed.data.fallbackCode ?? attendeeId ?? "";

  if (parsed.data.qrPayload) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(parsed.data.qrPayload);
    } catch {
      return NextResponse.json({ valid: false, error: "QR payload is not valid JSON" }, { status: 400 });
    }
    const payload = qrValidationSchema.safeParse(decoded);
    if (!payload.success || !verifyQrPayload(payload.data)) {
      return NextResponse.json({ valid: false, error: "Invalid QR signature" }, { status: 401 });
    }
    attendeeId = payload.data.attendeeId;
  }

  if (parsed.data.fallbackCode) {
    const pass = await prisma.pass.findUnique({ where: { fallbackCode: parsed.data.fallbackCode } });
    attendeeId = pass?.attendeeId;
  }

  if (!attendeeId) {
    return NextResponse.json({ valid: false, error: "No matching attendee found" }, { status: 404 });
  }

  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: attendeeInclude
  });

  if (!attendee) {
    return NextResponse.json({ valid: false, error: "Attendee not found" }, { status: 404 });
  }

  const duplicate = attendee.checkIns.some((checkIn) => !checkIn.duplicate);
  const checkIn = await prisma.checkIn.create({
    data: {
      attendeeId,
      duplicate,
      rawPayload
    }
  });

  const updated = await prisma.attendee.findUniqueOrThrow({
    where: { id: attendeeId },
    include: attendeeInclude
  });

  return NextResponse.json({
    valid: true,
    duplicate,
    under21Alert: updated.under21 || updated.plusOneUnder21,
    under21Message: updated.under21 && updated.plusOneUnder21
      ? "Attendee and plus-one self-identified as under 21."
      : updated.under21
        ? "Attendee self-identified as under 21."
        : updated.plusOneUnder21
          ? "Plus-one self-identified as under 21."
          : null,
    checkedInAt: checkIn.scannedAt.toISOString(),
    attendee: serializeAttendee(updated)
  });
}
