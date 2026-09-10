import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DISPLAY_PAIRING_WINDOW_MS, hashDisplaySecret } from "@/lib/raffle-display";

type Params = { params: Promise<{ displayId: string }> };

const pairingSchema = z.object({ code: z.string().trim().regex(/^[A-Z0-9]{6}$/) });

export async function POST(request: Request, { params }: Params) {
  const { displayId } = await params;
  const parsed = pairingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the six-character code shown on the display." }, { status: 400 });

  const display = await prisma.raffleDisplay.updateMany({
    where: { id: displayId },
    data: {
      pairingCodeHash: hashDisplaySecret(parsed.data.code.toUpperCase()),
      pairingExpiresAt: new Date(Date.now() + DISPLAY_PAIRING_WINDOW_MS)
    }
  });
  if (!display.count) return NextResponse.json({ error: "Display not found." }, { status: 404 });
  return NextResponse.json({ pairing: true });
}
