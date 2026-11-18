import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/authorization";
import { processDueCampaigns } from "@/lib/campaigns";
import { getPublicAppBaseUrl } from "@/lib/public-url";

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  return NextResponse.json({ processed: await processDueCampaigns(getPublicAppBaseUrl(request), access.authorization.organization.id) });
}
