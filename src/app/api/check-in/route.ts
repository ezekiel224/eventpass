import { NextRequest, NextResponse } from "next/server";
import { recordCheckIn } from "@/lib/check-in-admission";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee } from "@/lib/prisma-helpers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { checkInSchema, qrValidationSchema } from "@/lib/validation";
import { verifyQrPayload } from "@/services/qr";
import { rateLimit } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId")?.trim();
  const complete = request.nextUrl.searchParams.get("complete") === "true";
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim() || undefined;
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? (complete ? 100 : 20));
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 20, 1), 250);
  const attendeeWhere = {
    ...(eventId ? { eventId } : {}),
    event: { status: { not: "ARCHIVED" as const } },
    ...(query ? {
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { plusOneFirstName: { contains: query } },
        { plusOneLastName: { contains: query } },
        { company: { contains: query } },
        { ticketTier: { contains: query } }
      ]
    } : {})
  };
  const where = { attendee: attendeeWhere };
  const [rows, totalScans, admittedParties, matchingScans] = await Promise.all([
    prisma.checkIn.findMany({
      where,
      orderBy: [{ scannedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        attendee: {
          include: attendeeInclude
        }
      }
    }),
    prisma.checkIn.count({ where: { attendee: { ...(eventId ? { eventId } : {}), event: { status: { not: "ARCHIVED" } } } } }),
    prisma.checkIn.findMany({
      where: { duplicate: false, attendee: { ...(eventId ? { eventId } : {}), event: { status: { not: "ARCHIVED" } } } },
      distinct: ["attendeeId"],
      select: { attendee: { select: { plusOneEnabled: true } } }
    }),
    prisma.checkIn.count({ where })
  ]);
  const hasMore = rows.length > limit;
  const checkIns = rows.slice(0, limit);

  return NextResponse.json({
    checkIns: checkIns.map((checkIn) => ({
      id: checkIn.id,
      duplicate: checkIn.duplicate,
      scannedAt: checkIn.scannedAt.toISOString(),
      attendee: serializeAttendee(checkIn.attendee)
    })),
    nextCursor: hasMore ? checkIns.at(-1)?.id ?? null : null,
    summary: {
      totalScans,
      admittedGuests: admittedParties.reduce((total, admission) => total + (admission.attendee.plusOneEnabled ? 2 : 1), 0),
      matchingScans
    }
  });
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const rawScannerId = request.headers.get("x-eventpass-scanner-id")?.trim() ?? "";
  const scannerId = /^[a-zA-Z0-9_-]{1,80}$/.test(rawScannerId)
    ? rawScannerId
    : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "browser";
  const operatorId = session?.userId ?? "unknown";
  const scannerLimit = rateLimit(`checkin-scanner:${operatorId}:${scannerId}`, 600);
  const operatorLimit = rateLimit(`checkin-operator:${operatorId}`, 6000);
  if (!scannerLimit.ok || !operatorLimit.ok) {
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

  const duplicate = attendee.checkIns.some((checkIn) => !checkIn.duplicate);
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
  const checkIn = await recordCheckIn(prisma, attendeeId, rawPayload);

  const updated = await prisma.attendee.findUniqueOrThrow({
    where: { id: attendeeId },
    include: attendeeInclude
  });

  return NextResponse.json({
    valid: true,
    duplicate: checkIn.duplicate,
    under21Alert: updated.under21 || updated.plusOneUnder21,
    under21Message: updated.under21 && updated.plusOneUnder21
      ? "Primary attendee and guest self-identified as under 21."
      : updated.under21
        ? "Primary attendee self-identified as under 21."
        : updated.plusOneUnder21
          ? "Guest self-identified as under 21."
          : null,
    checkedInAt: checkIn.scannedAt.toISOString(),
    attendee: serializeAttendee(updated)
  });
}
