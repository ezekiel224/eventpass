import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { renderActionEmail, sendEmail } from "@/services/email";
import { markdownToHtml } from "@/lib/markdown";

export const campaignSegments = ["REGISTERED", "WAITLIST", "CHECKED_IN", "NOT_CHECKED_IN"] as const;
export type CampaignSegment = typeof campaignSegments[number];

function attendeeWhere(eventId: string, segment: string) {
  if (segment === "WAITLIST") return { eventId, status: "WAITLIST", email: { not: null } } as const;
  if (segment === "CHECKED_IN") return { eventId, status: "REGISTERED", email: { not: null }, checkIns: { some: { duplicate: false, reversedAt: null } } } as const;
  if (segment === "NOT_CHECKED_IN") return { eventId, status: "REGISTERED", email: { not: null }, checkIns: { none: { duplicate: false, reversedAt: null } } } as const;
  return { eventId, status: "REGISTERED", email: { not: null } } as const;
}

export async function countCampaignRecipients(eventId: string, segment: string) {
  return prisma.attendee.count({ where: attendeeWhere(eventId, segment) });
}

export async function sendCampaign(campaignId: string, publicBaseUrl: string) {
  const claimed = await prisma.campaign.updateMany({ where: { id: campaignId, status: { in: ["DRAFT", "SCHEDULED"] } }, data: { status: "SENDING" } });
  if (claimed.count === 0) return null;
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { event: true } });
  const attendees = await prisma.attendee.findMany({ where: attendeeWhere(campaign.eventId, campaign.segment), select: { id: true, firstName: true, lastName: true, email: true } });
  const branding = await getBranding(campaign.event.organizationId);

  await prisma.campaignRecipient.createMany({ data: attendees.flatMap((attendee) => attendee.email ? [{ campaignId, attendeeId: attendee.id, email: attendee.email, name: `${attendee.firstName} ${attendee.lastName}` }] : []) });
  const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId, status: "PENDING" } });
  let deliveredCount = 0;
  let failedCount = 0;
  for (const recipient of recipients) {
    const firstName = recipient.name.split(" ")[0] ?? recipient.name;
    const personalized = campaign.body.replaceAll("{{firstName}}", firstName).replaceAll("{{name}}", recipient.name).replaceAll("{{eventName}}", campaign.event.name);
    const subject = campaign.subject.replaceAll("{{firstName}}", firstName).replaceAll("{{name}}", recipient.name).replaceAll("{{eventName}}", campaign.event.name);
    try {
      const delivery = await sendEmail({
        to: recipient.email,
        subject,
        html: renderActionEmail({ organizationName: branding.name, heading: subject, messageHtml: markdownToHtml(personalized), actionUrl: `${publicBaseUrl}/register/${encodeURIComponent(campaign.eventId)}`, actionLabel: "View event details", primaryColor: branding.primaryColor })
      });
      await prisma.$transaction([
        prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: delivery.status, providerId: delivery.id, sentAt: new Date() } }),
        prisma.emailLog.create({ data: { eventId: campaign.eventId, attendeeId: recipient.attendeeId, recipient: recipient.email, type: "Campaign", subject, providerId: delivery.id, status: delivery.status } })
      ]);
      deliveredCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delivery failed";
      await prisma.$transaction([
        prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: message } }),
        prisma.emailLog.create({ data: { eventId: campaign.eventId, attendeeId: recipient.attendeeId, recipient: recipient.email, type: "Campaign", subject, status: "FAILED", error: message } })
      ]);
      failedCount += 1;
    }
  }
  return prisma.campaign.update({ where: { id: campaignId }, data: { status: failedCount > 0 && deliveredCount === 0 ? "FAILED" : "SENT", sentAt: new Date(), recipientCount: recipients.length, deliveredCount, failedCount } });
}

export async function processDueCampaigns(publicBaseUrl: string, organizationId?: string) {
  const due = await prisma.campaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, ...(organizationId ? { event: { organizationId } } : {}) }, select: { id: true }, take: 10 });
  for (const campaign of due) await sendCampaign(campaign.id, publicBaseUrl);
  return due.length;
}
