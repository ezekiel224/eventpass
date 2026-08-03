import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    select: { pass: { select: { qrPayload: true } } }
  });

  if (!attendee?.pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const png = await QRCode.toBuffer(attendee.pass.qrPayload, {
    type: "png",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M"
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
