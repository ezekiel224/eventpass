import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { attendeeInclude, serializeAttendee } from "@/lib/prisma-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function recentCheckIns(eventId?: string) {
  const checkIns = await prisma.checkIn.findMany({
    where: eventId ? { attendee: { eventId } } : undefined,
    orderBy: { scannedAt: "desc" },
    take: 30,
    include: { attendee: { include: attendeeInclude } }
  });

  return checkIns.map((checkIn) => ({
    id: checkIn.id,
    duplicate: checkIn.duplicate,
    scannedAt: checkIn.scannedAt.toISOString(),
    attendee: serializeAttendee(checkIn.attendee)
  }));
}

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId") || undefined;
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let lastSignature = "";

  const stream = new ReadableStream({
    async start(controller) {
      const sendSnapshot = async () => {
        try {
          const checkIns = await recentCheckIns(eventId);
          const signature = checkIns.map((checkIn) => checkIn.id).join(":");
          if (signature !== lastSignature) {
            lastSignature = signature;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ checkIns })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
        } catch {
          controller.enqueue(encoder.encode("event: scanner-error\ndata: {}\n\n"));
        }
      };

      await sendSnapshot();
      interval = setInterval(() => void sendSnapshot(), 1000);
      request.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // The client may already have closed the stream.
        }
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
