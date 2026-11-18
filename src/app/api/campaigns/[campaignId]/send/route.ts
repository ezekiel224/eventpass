import { NextRequest, NextResponse } from "next/server";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { sendCampaign } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { getPublicAppBaseUrl } from "@/lib/public-url";

export async function POST(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const { campaignId } = await params;
  const owned = await prisma.campaign.findFirst({ where: { id: campaignId, event: { organizationId: access.authorization.organization.id } }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const campaign = await sendCampaign(campaignId, getPublicAppBaseUrl(request));
  if (!campaign) return NextResponse.json({ error: "This campaign was already sent or is currently sending." }, { status: 409 });
  await prisma.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, organizationId: access.authorization.organization.id, action: "campaign.sent", targetType: "Campaign", targetId: campaignId, metadata: { recipientCount: campaign.recipientCount, deliveredCount: campaign.deliveredCount, failedCount: campaign.failedCount } }) });
  return NextResponse.json({ campaign });
}
