import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";

const schema = z.object({ eventId: z.string().min(3), deviceKey: z.string().uuid(), name: z.string().trim().min(2).max(80) });

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "checkins:manage");
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid station details" }, { status: 400 });
  const event = await prisma.event.findFirst({ where: { id: parsed.data.eventId, organizationId: access.authorization.organization.id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const station = await prisma.checkInStation.upsert({
    where: { eventId_deviceKey: { eventId: parsed.data.eventId, deviceKey: parsed.data.deviceKey } },
    create: { ...parsed.data, lastSeenAt: new Date() },
    update: { name: parsed.data.name, active: true, lastSeenAt: new Date() }
  });
  return NextResponse.json({ station });
}
