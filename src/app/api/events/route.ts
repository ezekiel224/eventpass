import { NextRequest, NextResponse } from "next/server";
import { eventSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { eventQueryInclude, getDefaultOrganization, serializeEvent, stringifyStringArray } from "@/lib/prisma-helpers";
import { rateLimit } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  await getDefaultOrganization();
  const events = await prisma.event.findMany({
    include: eventQueryInclude(),
    orderBy: {
      startsAt: "asc"
    }
  });

  return NextResponse.json({ events: events.map(serializeEvent) });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`events:${request.headers.get("x-forwarded-for") ?? "local"}`, 20);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await getDefaultOrganization();
  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      photoUrl: parsed.data.photoUrl || undefined,
      allergenOptions: stringifyStringArray(parsed.data.allergenOptions),
      organizationId: organization.id,
      status: "PUBLISHED"
    },
    include: eventQueryInclude()
  });

  return NextResponse.json({ event: serializeEvent(event) }, { status: 201 });
}
