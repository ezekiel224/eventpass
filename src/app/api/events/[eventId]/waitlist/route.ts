import { NextRequest, NextResponse } from "next/server";
import { auditLogData } from "@/lib/audit";
import { authorizeEventApi } from "@/lib/authorization";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { attendeeInclude, createPassForAttendee, serializeAttendee } from "@/lib/prisma-helpers";
import { getPublicAppBaseUrl } from "@/lib/public-url";
import { renderActionEmail, sendEmail } from "@/services/email";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await authorizeEventApi(request, eventId, "attendees:manage");
  if (!access.ok) return access.response;
  const [event, attendees] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, capacity: true } }),
    prisma.attendee.findMany({ where: { eventId, status: "WAITLIST" }, orderBy: { createdAt: "asc" }, include: attendeeInclude })
  ]);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const registered = await prisma.attendee.count({ where: { eventId, status: "REGISTERED" } });
  return NextResponse.json({ event, registered, available: Math.max(0, event.capacity - registered), attendees: attendees.map(serializeAttendee) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await authorizeEventApi(request, eventId, "attendees:manage");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null) as { attendeeId?: string; action?: string } | null;
  if (!body?.attendeeId || !["PROMOTE", "REMOVE"].includes(body.action ?? "")) return NextResponse.json({ error: "Choose a valid waitlist action." }, { status: 400 });
  const attendee = await prisma.attendee.findFirst({ where: { id: body.attendeeId, eventId, status: "WAITLIST" }, include: { event: true } });
  if (!attendee) return NextResponse.json({ error: "Waitlisted attendee not found." }, { status: 404 });

  if (body.action === "REMOVE") {
    await prisma.$transaction(async (transaction) => {
      await transaction.attendee.update({ where: { id: attendee.id }, data: { status: "CANCELLED" } });
      await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, organizationId: access.authorization.organization.id, action: "waitlist.removed", targetType: "Attendee", targetId: attendee.id, metadata: { eventId, attendeeEmail: attendee.email } }) });
    });
    return NextResponse.json({ ok: true });
  }

  const registered = await prisma.attendee.count({ where: { eventId, status: "REGISTERED" } });
  if (registered >= attendee.event.capacity) return NextResponse.json({ error: "The event is still at capacity. Increase capacity or free a seat first." }, { status: 409 });
  if (!attendee.email) return NextResponse.json({ error: "Add an email address to this attendee before promoting them so the pass can be delivered." }, { status: 409 });

  await prisma.$transaction(async (transaction) => {
    await transaction.attendee.update({ where: { id: attendee.id }, data: { status: "REGISTERED" } });
    await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, organizationId: access.authorization.organization.id, action: "waitlist.promoted", targetType: "Attendee", targetId: attendee.id, metadata: { eventId, eventName: attendee.event.name, attendeeEmail: attendee.email } }) });
  });
  const pass = await createPassForAttendee(attendee.id, eventId);
  let emailStatus = "QUEUED";
  {
    const branding = await getBranding(access.authorization.organization.id);
    const appBaseUrl = getPublicAppBaseUrl(request);
    const passUrl = `${appBaseUrl}/pass/${encodeURIComponent(attendee.id)}`;
    try {
      const delivery = await sendEmail({
        to: attendee.email,
        subject: `A place is available for ${attendee.event.name}`,
        html: renderActionEmail({ organizationName: branding.name, heading: "You’re off the waitlist", messageHtml: `A place is now available for <strong>${attendee.event.name}</strong>. Your registration is confirmed and your pass is ready.`, actionUrl: passUrl, actionLabel: "Open digital pass", primaryColor: branding.primaryColor })
      });
      emailStatus = delivery.status;
      await prisma.emailLog.create({ data: { eventId, attendeeId: attendee.id, recipient: attendee.email, type: "Waitlist promotion", subject: `A place is available for ${attendee.event.name}`, providerId: delivery.id, status: delivery.status } });
    } catch (error) {
      emailStatus = "FAILED";
      await prisma.emailLog.create({ data: { eventId, attendeeId: attendee.id, recipient: attendee.email, type: "Waitlist promotion", subject: `A place is available for ${attendee.event.name}`, status: "FAILED", error: error instanceof Error ? error.message : "Delivery failed" } });
    }
  }
  return NextResponse.json({ ok: true, fallbackCode: pass.fallbackCode, emailStatus });
}
