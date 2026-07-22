import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(request: NextRequest, { params }: Params) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: { event: true, pass: true }
  });
  if (!attendee?.pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const passUrl = new URL(`/pass/${attendee.id}`, request.nextUrl.origin).toString();
  const location = [attendee.event.venue, attendee.event.address].filter(Boolean).join(", ");
  const description = `Your individual registration pass: ${passUrl}`;
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventPass//Registration Pass//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${attendee.id}@eventpass`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(attendee.event.startsAt)}`,
    `DTEND:${icsDate(attendee.event.endsAt)}`,
    `SUMMARY:${escapeIcs(attendee.event.name)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${escapeIcs(passUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");

  const filename = `${attendee.event.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`;
  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
