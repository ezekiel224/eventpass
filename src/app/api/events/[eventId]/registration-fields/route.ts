import { NextRequest, NextResponse } from "next/server";
import { auditLogData } from "@/lib/audit";
import { authorizeEventApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { parseRegistrationFields, registrationFieldsSchema } from "@/lib/registration-fields";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await authorizeEventApi(request, eventId, "events:manage");
  if (!access.ok) return access.response;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true, registrationFields: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: { id: event.id, name: event.name }, fields: parseRegistrationFields(event.registrationFields) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await authorizeEventApi(request, eventId, "events:manage");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const parsed = registrationFieldsSchema.safeParse(body?.fields);
  if (!parsed.success) return NextResponse.json({ error: "Review the registration fields.", details: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await prisma.$transaction(async (transaction) => {
    await transaction.event.update({ where: { id: eventId }, data: { registrationFields: JSON.stringify(parsed.data) } });
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        actor: access.authorization.user,
        organizationId: access.authorization.organization.id,
        action: "registration.form.updated",
        targetType: "Event",
        targetId: eventId,
        metadata: { eventName: existing.name, fieldCount: parsed.data.length, fieldIds: parsed.data.map((field) => field.id) }
      })
    });
  });

  return NextResponse.json({ fields: parsed.data });
}
