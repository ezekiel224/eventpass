import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee, stringifyStringArray } from "@/lib/prisma-helpers";
import { attendeeUpdateSchema } from "@/lib/validation";
import { authorizeApi } from "@/lib/authorization";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await authorizeApi(request, "attendees:manage");
  if (!access.ok) return access.response;
  const { attendeeId } = await params;
  const parsed = attendeeUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.attendee.findFirst({ where: { id: attendeeId, event: { organizationId: access.authorization.organization.id } } });
  if (!existing) return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  const attendee = await prisma.attendee.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      selectedAllergens: stringifyStringArray(parsed.data.selectedAllergens),
      selectedMenu: parsed.data.selectedMenu || null,
      plusOneAllergens: stringifyStringArray(parsed.data.plusOneAllergens),
      plusOneMenu: parsed.data.plusOneEnabled === false ? null : parsed.data.plusOneMenu || null,
      plusOneUnder21: parsed.data.plusOneEnabled === false ? false : parsed.data.plusOneUnder21,
      customAnswers: parsed.data.customAnswers ? JSON.stringify(parsed.data.customAnswers) : undefined
    },
    include: attendeeInclude
  });

  return NextResponse.json({ attendee: serializeAttendee(attendee) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await authorizeApi(request, "attendees:manage");
  if (!access.ok) return access.response;
  const { attendeeId } = await params;
  const existing = await prisma.attendee.findFirst({ where: { id: attendeeId, event: { organizationId: access.authorization.organization.id } } });
  if (!existing) return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  await prisma.checkIn.deleteMany({ where: { attendeeId: existing.id } });
  await prisma.pass.deleteMany({ where: { attendeeId: existing.id } });
  await prisma.attendee.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
