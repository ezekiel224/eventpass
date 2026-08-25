import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/services/email";

export const PRIZE_ACCEPTANCE_DAYS = 30;

export function hashPrizeAcceptanceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function issuePrizeAcceptance(prizeId: string, fallbackOrigin: string) {
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

  let delivery: "SENT" | "QUEUED" | "NO_EMAIL" | "FAILED" = "NO_EMAIL";
  if (attendee.email) {
    try {
      const result = await sendEmail({
        to: attendee.email,
        subject: `Signature required for your ${prize.name} prize`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px;color:#111827">
            <h1 style="font-size:24px">Prize receipt signature required</h1>
            <p>Hi ${escapeHtml(attendee.firstName)},</p>
            <p>You won <strong>${escapeHtml(prize.name)}</strong>${prize.value ? ` with a fair-market value of <strong>${escapeHtml(prize.value)}</strong>` : ""} at ${escapeHtml(prize.event.name)}.</p>
            <p>Please review the tax acknowledgment and sign the prize receipt. The link expires in ${PRIZE_ACCEPTANCE_DAYS} days.</p>
            <p><a href="${escapeHtml(acceptanceUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#315CF5;color:#fff;text-decoration:none;font-weight:bold">Review and sign</a></p>
            <p style="color:#64748b;font-size:13px">If you did not win this prize, contact ${escapeHtml(prize.event.contactEmail)}.</p>
          </div>`
      });
      delivery = result.status;
      await prisma.emailLog.create({
        data: {
          eventId: prize.eventId,
          attendeeId: attendee.id,
          recipient: attendee.email,
          type: "PRIZE_ACCEPTANCE",
          subject: `Signature required for your ${prize.name} prize`,
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
          subject: `Signature required for your ${prize.name} prize`,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Email delivery failed"
        }
      });
    }
  }

  return { acceptanceUrl, expiresAt, delivery, recipient: attendee.email };
}
