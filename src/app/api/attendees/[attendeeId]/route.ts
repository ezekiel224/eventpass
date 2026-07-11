import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee, stringifyStringArray } from "@/lib/prisma-helpers";
import { attendeeUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: Params) {
  const { attendeeId } = await params;
  const parsed = attendeeUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const attendee = await prisma.attendee.update({
    where: { id: attendeeId },
    data: {
      ...parsed.data,
      selectedAllergens: stringifyStringArray(parsed.data.selectedAllergens),
      plusOneAllergens: stringifyStringArray(parsed.data.plusOneAllergens),
      plusOneUnder21: parsed.data.plusOneEnabled === false ? false : parsed.data.plusOneUnder21,
      customAnswers: parsed.data.customAnswers ? JSON.stringify(parsed.data.customAnswers) : undefined
    },
    include: attendeeInclude
  });

  return NextResponse.json({ attendee: serializeAttendee(attendee) });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { attendeeId } = await params;
  await prisma.checkIn.deleteMany({ where: { attendeeId } });
  await prisma.pass.deleteMany({ where: { attendeeId } });
  await prisma.attendee.delete({ where: { id: attendeeId } });
  return NextResponse.json({ ok: true });
}
