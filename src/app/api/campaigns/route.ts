import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { campaignSegments, countCampaignRecipients } from "@/lib/campaigns";
import { prisma } from "@/lib/db";

const schema = z.object({
  eventId: z.string().min(3), name: z.string().trim().min(2).max(120), subject: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(10_000),
  segment: z.enum(campaignSegments), scheduledAt: z.string().datetime({ offset: true }).nullable().optional()
});

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const eventId = request.nextUrl.searchParams.get("eventId") ?? undefined;
  const campaigns = await prisma.campaign.findMany({ where: eventId ? { eventId } : undefined, include: { event: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ campaigns: campaigns.map((campaign) => ({ ...campaign, scheduledAt: campaign.scheduledAt?.toISOString() ?? null, sentAt: campaign.sentAt?.toISOString() ?? null, createdAt: campaign.createdAt.toISOString(), updatedAt: campaign.updatedAt.toISOString() })) });
}

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the campaign details.", details: parsed.error.flatten() }, { status: 400 });
  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true, name: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const recipientCount = await countCampaignRecipients(event.id, parsed.data.segment);
  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const status = scheduledAt ? "SCHEDULED" : "DRAFT";
  const campaign = await prisma.$transaction(async (transaction) => {
    const created = await transaction.campaign.create({ data: { ...parsed.data, scheduledAt, status, createdById: access.authorization.user.id, recipientCount } });
    await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, action: scheduledAt ? "campaign.scheduled" : "campaign.created", targetType: "Campaign", targetId: created.id, metadata: { eventId: event.id, eventName: event.name, segment: created.segment, recipientCount, scheduledAt: scheduledAt?.toISOString() } }) });
    return created;
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
