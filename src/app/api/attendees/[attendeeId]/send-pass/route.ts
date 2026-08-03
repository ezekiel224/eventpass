import { NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { renderPassEmail, sendEmail } from "@/services/email";
import { formatDate, formatTime } from "@/lib/utils";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: Params) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: {
      event: true,
      pass: true
    }
  });

  if (!attendee || !attendee.pass) {
    return NextResponse.json({ error: "Attendee or pass not found" }, { status: 404 });
  }

  const passUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/pass/${attendee.id}`;
  const subject = `Your pass for ${attendee.event.name}`;
  let status = "QUEUED";
  let providerId: string | undefined;
  let errorMessage: string | undefined;

  try {
    const branding = await getBranding();
    const qrImageUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/api/pass/${attendee.id}/qr`;
    const delivery = await sendEmail({
      to: attendee.email,
      subject,
      html: renderPassEmail({
        name: `${attendee.firstName} ${attendee.lastName}`,
        eventName: attendee.event.name,
        eventDescription: attendee.event.description,
        venue: attendee.event.venue,
        address: attendee.event.address,
        eventDate: formatDate(attendee.event.startsAt, branding.timezone),
        eventTime: `${formatTime(attendee.event.startsAt, branding.timezone)} - ${formatTime(attendee.event.endsAt, branding.timezone)}`,
        ticketTier: attendee.ticketTier,
        seat: attendee.seat,
        organizer: attendee.event.organizer,
        contactEmail: attendee.event.contactEmail,
        passUrl,
        qrImageUrl,
        fallbackCode: attendee.pass.fallbackCode,
        organizationName: branding.name,
        primaryColor: branding.primaryColor
      })
    });
    status = delivery.status;
    providerId = delivery.id;
  } catch (error) {
    status = "FAILED";
    errorMessage = error instanceof Error ? error.message : "Email delivery failed";
  }

  const log = await prisma.emailLog.create({
    data: {
      eventId: attendee.eventId,
      attendeeId: attendee.id,
      recipient: attendee.email,
      type: "Digital pass resend",
      subject,
      providerId,
      status,
      error: errorMessage
    }
  });

  return NextResponse.json({
    ok: status !== "FAILED",
    status,
    error: errorMessage,
    logId: log.id
  }, { status: status === "FAILED" ? 502 : 200 });
}
