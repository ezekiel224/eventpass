import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/authorization";
import { campaignSegments, countCampaignRecipients } from "@/lib/campaigns";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const eventId = request.nextUrl.searchParams.get("eventId") ?? "";
  const segment = request.nextUrl.searchParams.get("segment") ?? "REGISTERED";
  if (!eventId || !campaignSegments.includes(segment as typeof campaignSegments[number])) return NextResponse.json({ error: "Invalid preview request" }, { status: 400 });
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId: access.authorization.organization.id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ count: await countCampaignRecipients(eventId, segment) });
}
