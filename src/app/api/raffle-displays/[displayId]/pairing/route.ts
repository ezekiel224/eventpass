import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPairingCode, DISPLAY_PAIRING_WINDOW_MS, hashDisplaySecret } from "@/lib/raffle-display";

type Params = { params: Promise<{ displayId: string }> };

export async function POST(_: Request, { params }: Params) {
  const { displayId } = await params;
  const pairingCode = createPairingCode();
  const display = await prisma.raffleDisplay.updateMany({
    where: { id: displayId },
    data: {
      pairingCodeHash: hashDisplaySecret(pairingCode),
      pairingExpiresAt: new Date(Date.now() + DISPLAY_PAIRING_WINDOW_MS)
    }
  });
  if (!display.count) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  return NextResponse.json({ pairingCode });
}
