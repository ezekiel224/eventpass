import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createDisplayToken, hashDisplaySecret } from "@/lib/raffle-display";
import { rateLimit } from "@/services/rate-limit";

const pairSchema = z.object({ code: z.string().trim().min(6).max(12) });

export async function POST(request: NextRequest) {
  const limited = rateLimit(`display-pair:${request.headers.get("x-forwarded-for") ?? "local"}`, 20);
  if (!limited.ok) return NextResponse.json({ error: "Too many pairing attempts. Wait a moment and try again." }, { status: 429 });

  const parsed = pairSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the six-character pairing code." }, { status: 400 });

  const pairingCodeHash = hashDisplaySecret(parsed.data.code.toUpperCase());
  const display = await prisma.raffleDisplay.findFirst({
    where: { pairingCodeHash, pairingExpiresAt: { gt: new Date() } },
    select: { id: true, name: true }
  });
  if (!display) return NextResponse.json({ error: "That pairing code is invalid or has expired." }, { status: 404 });

  const token = createDisplayToken();
  const claimed = await prisma.raffleDisplay.updateMany({
    where: { id: display.id, pairingCodeHash },
    data: {
      tokenHash: hashDisplaySecret(token),
      pairingCodeHash: null,
      pairingExpiresAt: null,
      pairedAt: new Date(),
      lastSeenAt: new Date()
    }
  });
  if (!claimed.count) return NextResponse.json({ error: "That display was already paired. Request a new code." }, { status: 409 });

  return NextResponse.json({ token, display: { id: display.id, name: display.name } });
}
