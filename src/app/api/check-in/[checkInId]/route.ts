import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";

const schema = z.object({ reason: z.string().trim().min(3).max(240) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ checkInId: string }> }) {
  const access = await authorizeApi(request, "checkins:manage");
  if (!access.ok) return access.response;
  const { checkInId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a short reason for the undo." }, { status: 400 });
  const checkIn = await prisma.checkIn.findFirst({ where: { id: checkInId, attendee: { event: { organizationId: access.authorization.organization.id } } }, include: { attendee: { select: { firstName: true, lastName: true, eventId: true } }, station: { select: { name: true } } } });
  if (!checkIn) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  if (checkIn.reversedAt) return NextResponse.json({ error: "This check-in has already been undone." }, { status: 409 });
  const reversedAt = new Date();
  await prisma.$transaction([
    prisma.checkIn.update({ where: { id: checkInId }, data: { admissionKey: null, reversedAt, reversedById: access.authorization.user.id, reversalReason: parsed.data.reason } }),
    prisma.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, organizationId: access.authorization.organization.id, action: "checkin.reversed", targetType: "CheckIn", targetId: checkInId, metadata: { attendeeId: checkIn.attendeeId, attendeeName: `${checkIn.attendee.firstName} ${checkIn.attendee.lastName}`, eventId: checkIn.attendee.eventId, stationName: checkIn.station?.name, reason: parsed.data.reason, originalScannedAt: checkIn.scannedAt.toISOString() } }) })
  ]);
  return NextResponse.json({ ok: true, reversedAt: reversedAt.toISOString() });
}
