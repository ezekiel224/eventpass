import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/authorization";
import { campaignSegments, countCampaignRecipients } from "@/lib/campaigns";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const eventId = request.nextUrl.searchParams.get("eventId") ?? "";
  const segment = request.nextUrl.searchParams.get("segment") ?? "REGISTERED";
  if (!eventId || !campaignSegments.includes(segment as typeof campaignSegments[number])) return NextResponse.json({ error: "Invalid preview request" }, { status: 400 });
  return NextResponse.json({ count: await countCampaignRecipients(eventId, segment) });
}
