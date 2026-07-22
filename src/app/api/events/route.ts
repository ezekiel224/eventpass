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
    return NextResponse.json({ error: "Too many event requests. Wait a moment and try again." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The event request was not valid JSON." }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return NextResponse.json({ error: "Review the highlighted event details.", fieldErrors: flattened.fieldErrors, formErrors: flattened.formErrors }, { status: 400 });
  }

  const requestedStatus = typeof body === "object" && body && "status" in body && body.status === "DRAFT" ? "DRAFT" : "PUBLISHED";

  try {
    const organization = await getDefaultOrganization();
    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        photoUrl: parsed.data.photoUrl || undefined,
        allergenOptions: stringifyStringArray(parsed.data.allergenOptions),
        organizationId: organization.id,
        status: requestedStatus
      },
      include: eventQueryInclude()
    });

    return NextResponse.json({ event: serializeEvent(event) }, { status: 201 });
  } catch (error) {
    console.error("Could not create event", error);
    return NextResponse.json({ error: "The event could not be saved. No event was created; please try again." }, { status: 500 });
  }
}
