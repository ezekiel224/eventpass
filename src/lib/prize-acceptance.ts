import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { getCommunicationTemplate, renderCommunicationTemplate } from "@/lib/communication-templates";
import { renderActionEmail, sendEmail } from "@/services/email";

export const PRIZE_ACCEPTANCE_DAYS = 30;

export function hashPrizeAcceptanceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePrizeAcceptance(
  prizeId: string,
  fallbackOrigin: string,
  { emailWinner = false }: { emailWinner?: boolean } = {}
) {
  const prize = await prisma.rafflePrize.findUnique({
    where: { id: prizeId },
    include: { event: true }
  });

  if (!prize?.winnerAttendeeId || !prize.winnerName) {
    throw new Error("A final winner is required before requesting a signature.");
  }
  if (prize.acceptanceStatus === "SIGNED") {
    throw new Error("This winner has already signed. The completed signature cannot be replaced.");
  }

  const attendee = await prisma.attendee.findFirst({
    where: { id: prize.winnerAttendeeId, eventId: prize.eventId }
  });
  if (!attendee) {
    throw new Error("The winning attendee could not be found.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PRIZE_ACCEPTANCE_DAYS * 24 * 60 * 60 * 1000);
  const appBaseUrl = process.env.APP_URL?.trim() || fallbackOrigin;
  const acceptanceUrl = `${appBaseUrl.replace(/\/+$/, "")}/prize-acceptance/${token}`;

  await prisma.rafflePrize.update({
    where: { id: prize.id },
    data: {
      acceptanceStatus: "PENDING",
      acceptanceTokenHash: hashPrizeAcceptanceToken(token),
      acceptanceExpiresAt: expiresAt,
      acceptanceSignerName: null,
      acceptanceSapId: null,
      taxAcknowledged: false,
      signatureDataUrl: null,
      acceptedAt: null,
      acceptedIp: null,
      acceptedUserAgent: null
    }
  });

  let delivery: "SENT" | "QUEUED" | "NOT_SENT" | "NO_EMAIL" | "FAILED" = attendee.email ? "NOT_SENT" : "NO_EMAIL";
  if (emailWinner && attendee.email) {
    let subject = `Signature required for your ${prize.name} prize`;
    try {
      const branding = await getBranding();
      const template = await getCommunicationTemplate(prize.event.organizationId, "PRIZE_ACCEPTANCE");
      const rendered = renderCommunicationTemplate(template, {
        name: `${attendee.firstName} ${attendee.lastName}`,
        eventName: prize.event.name,
        prizeName: prize.name,
        prizeValue: prize.value ? ` with a fair-market value of ${prize.value}` : "",
        expirationDays: String(PRIZE_ACCEPTANCE_DAYS),
        contactEmail: prize.event.contactEmail,
        organizationName: branding.name
      });
      subject = rendered.subject;
      const result = await sendEmail({
        to: attendee.email,
        subject,
        html: renderActionEmail({
          organizationName: branding.name,
          heading: "Prize receipt signature required",
          messageHtml: rendered.bodyHtml,
          actionUrl: acceptanceUrl,
          actionLabel: rendered.actionLabel,
          primaryColor: branding.primaryColor
        })
      });
      delivery = result.status;
      await prisma.emailLog.create({
        data: {
          eventId: prize.eventId,
          attendeeId: attendee.id,
          recipient: attendee.email,
          type: "PRIZE_ACCEPTANCE",
          subject,
          providerId: result.id,
          status: result.status
        }
      });
    } catch (error) {
      delivery = "FAILED";
      await prisma.emailLog.create({
        data: {
          eventId: prize.eventId,
          attendeeId: attendee.id,
          recipient: attendee.email,
          type: "PRIZE_ACCEPTANCE",
          subject,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Email delivery failed"
        }
      });
    }
  }

  return { acceptanceUrl, expiresAt, delivery, recipient: attendee.email };
}
