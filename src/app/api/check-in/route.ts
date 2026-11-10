import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee } from "@/lib/prisma-helpers";
import { checkInSchema, qrValidationSchema } from "@/lib/validation";
import { verifyQrPayload } from "@/services/qr";
import { rateLimit } from "@/services/rate-limit";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkIns = await prisma.checkIn.findMany({
    where: { attendee: { event: { status: { not: "ARCHIVED" } } } },
    orderBy: { scannedAt: "desc" },
    take: 20,
    include: {
      station: true,
      attendee: {
        include: attendeeInclude
      }
    }
  });

  return NextResponse.json({
    checkIns: checkIns.map((checkIn) => ({
      id: checkIn.id,
      duplicate: checkIn.duplicate,
      reversedAt: checkIn.reversedAt?.toISOString() ?? null,
      stationName: checkIn.station?.name ?? null,
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

  if (parsed.data.clientScanId) {
    const existing = await prisma.checkIn.findUnique({ where: { clientScanId: parsed.data.clientScanId }, include: { attendee: { include: attendeeInclude } } });
    if (existing) return NextResponse.json({ valid: true, duplicate: existing.duplicate, under21Alert: existing.attendee.under21 || existing.attendee.plusOneUnder21, under21Message: null, checkedInAt: existing.scannedAt.toISOString(), attendee: serializeAttendee(existing.attendee), reconciled: true });
  }

  let attendeeId = parsed.data.attendeeId;
  const rawPayload = parsed.data.qrPayload ?? parsed.data.fallbackCode ?? attendeeId ?? "";

  if (parsed.data.qrPayload) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(parsed.data.qrPayload);
    } catch {
      const pass = await prisma.pass.findUnique({ where: { fallbackCode: parsed.data.qrPayload.trim() } });
      attendeeId = pass?.attendeeId;
      decoded = null;
    }
    if (decoded) {
      const payload = qrValidationSchema.safeParse(decoded);
      if (!payload.success || !verifyQrPayload(payload.data)) {
        return NextResponse.json({ valid: false, error: "Invalid QR signature" }, { status: 401 });
      }
      attendeeId = payload.data.attendeeId;
    }
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

  if (parsed.data.eventId && attendee.eventId !== parsed.data.eventId) {
    return NextResponse.json({ valid: false, error: "This pass belongs to a different event" }, { status: 409 });
  }

  if (attendee.event.status === "ARCHIVED") {
    return NextResponse.json({ valid: false, error: "This event is archived and no longer accepts check-ins" }, { status: 400 });
  }

  const duplicate = attendee.checkIns.some((checkIn) => !checkIn.duplicate && !checkIn.reversedAt);
  if (parsed.data.testMode) {
    return NextResponse.json({
      valid: true,
      duplicate,
      testMode: true,
      under21Alert: attendee.under21 || attendee.plusOneUnder21,
      under21Message: attendee.under21 || attendee.plusOneUnder21 ? "Age verification would be required during live check-in." : null,
      checkedInAt: new Date().toISOString(),
      attendee: serializeAttendee(attendee)
    });
  }
  if (parsed.data.stationId) {
    const station = await prisma.checkInStation.findFirst({ where: { id: parsed.data.stationId, eventId: attendee.eventId, active: true }, select: { id: true } });
    if (!station) return NextResponse.json({ valid: false, error: "This scanner station is not assigned to the event." }, { status: 409 });
  }
  const currentUser = await getCurrentUser();
  const checkIn = await prisma.checkIn.create({
    data: {
      attendeeId,
      duplicate,
      rawPayload,
      stationId: parsed.data.stationId,
      clientScanId: parsed.data.clientScanId,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
      syncedAt: parsed.data.clientScanId ? new Date() : undefined,
      scannedById: currentUser?.id
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
      ? "Primary attendee and guest self-identified as under 21."
      : updated.under21
        ? "Primary attendee self-identified as under 21."
        : updated.plusOneUnder21
          ? "Guest self-identified as under 21."
          : null,
    checkedInAt: checkIn.scannedAt.toISOString(),
    clientRecordedAt: checkIn.recordedAt?.toISOString() ?? null,
    attendee: serializeAttendee(updated)
  });
}
