import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPrizeReceiptWorkbook } from "@/lib/prize-receipt-xlsx";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      rafflePrizes: {
        where: { status: "ACTIVE", winnerName: { not: null } },
        orderBy: { drawnAt: "asc" }
      }
    }
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.prizeReceiptSubmitter || !event.prizeReceiptExtension || !event.prizeFundingSource) {
    return NextResponse.json({ error: "Complete the payroll submitter, extension, and funding designation before exporting." }, { status: 409 });
  }
  if (event.rafflePrizes.length === 0) {
    return NextResponse.json({ error: "Draw at least one final winner before exporting." }, { status: 409 });
  }
  const unsigned = event.rafflePrizes.filter((prize) => prize.acceptanceStatus !== "SIGNED" || !prize.signatureDataUrl || !prize.acceptedAt);
  if (unsigned.length > 0) {
    return NextResponse.json({ error: `${unsigned.length} winner${unsigned.length === 1 ? " has" : "s have"} not signed yet. The payroll workbook is available after every winner signs.` }, { status: 409 });
  }

  const workbook = createPrizeReceiptWorkbook(event, event.rafflePrizes);
  const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
  return new Response(Buffer.from(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slug}-prize-receipts.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
