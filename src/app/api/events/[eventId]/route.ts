import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventQueryInclude, serializeEvent, stringifyStringArray } from "@/lib/prisma-helpers";
import { eventUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventQueryInclude()
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: serializeEvent(event) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The event request was not valid JSON." }, { status: 400 });
  }
  const parsed = eventUpdateSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return NextResponse.json({ error: "Review the highlighted event details.", fieldErrors: flattened.fieldErrors, formErrors: flattened.formErrors }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || undefined,
      allergenOptions: stringifyStringArray(parsed.data.allergenOptions)
    },
    include: eventQueryInclude()
  });

  return NextResponse.json({ event: serializeEvent(event) });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
