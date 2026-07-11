import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { eventQueryInclude, serializeEvent, stringifyStringArray } from "@/lib/prisma-helpers";
import { eventSchema } from "@/lib/validation";

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
  const body = await request.json();
  const parsed = eventSchema.partial().extend({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
