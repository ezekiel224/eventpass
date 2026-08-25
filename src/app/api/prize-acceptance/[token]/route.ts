import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestIp } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { hashPrizeAcceptanceToken } from "@/lib/prize-acceptance";
import { rateLimit } from "@/services/rate-limit";

type Params = { params: Promise<{ token: string }> };

const signatureSchema = z.object({
  signerName: z.string().trim().min(2).max(160),
  sapId: z.string().trim().min(1).max(40),
  taxAcknowledged: z.literal(true),
  signatureDataUrl: z.string()
    .min(500, "Draw your signature before submitting.")
    .max(300_000, "The signature image is too large.")
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "The signature image is invalid.")
});

export async function POST(request: NextRequest, { params }: Params) {
  const limited = rateLimit(`prize-acceptance:${requestIp(request) ?? "local"}`, 12);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }

  const { token } = await params;
  const parsed = signatureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Review the signature form." }, { status: 400 });
  }

  const tokenHash = hashPrizeAcceptanceToken(token);
  const prize = await prisma.rafflePrize.findUnique({ where: { acceptanceTokenHash: tokenHash } });
  if (!prize || prize.acceptanceStatus !== "PENDING") {
    return NextResponse.json({ error: "This signature link is invalid or has already been used." }, { status: 404 });
  }
  if (!prize.acceptanceExpiresAt || prize.acceptanceExpiresAt <= new Date()) {
    return NextResponse.json({ error: "This signature link has expired. Ask the event organizer to send a new one." }, { status: 410 });
  }

  const acceptedAt = new Date();
  const updated = await prisma.rafflePrize.updateMany({
    where: { id: prize.id, acceptanceTokenHash: tokenHash, acceptanceStatus: "PENDING" },
    data: {
      acceptanceStatus: "SIGNED",
      acceptanceTokenHash: null,
      acceptanceExpiresAt: null,
      acceptanceSignerName: parsed.data.signerName,
      acceptanceSapId: parsed.data.sapId,
      taxAcknowledged: true,
      signatureDataUrl: parsed.data.signatureDataUrl,
      acceptedAt,
      acceptedIp: requestIp(request),
      acceptedUserAgent: request.headers.get("user-agent")
    }
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: "This signature was already submitted." }, { status: 409 });
  }

  await prisma.auditLog.create({
    data: {
      action: "PRIZE_ACCEPTANCE_SIGNED",
      targetType: "RafflePrize",
      targetId: prize.id,
      metadata: JSON.stringify({ signerName: parsed.data.signerName, acceptedAt: acceptedAt.toISOString() }),
      ipAddress: requestIp(request),
      userAgent: request.headers.get("user-agent")
    }
  });

  return NextResponse.json({ ok: true, acceptedAt: acceptedAt.toISOString() });
}
