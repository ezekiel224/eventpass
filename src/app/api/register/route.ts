import { NextRequest, NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { attendeeInclude, createPassForAttendee, serializeAttendee, stringifyStringArray } from "@/lib/prisma-helpers";
import { attendeeRegistrationSchema } from "@/lib/validation";
import { renderPassEmail, sendEmail } from "@/services/email";
import { rateLimit } from "@/services/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`register:${request.headers.get("x-forwarded-for") ?? "local"}`, 12);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many registrations from this source" }, { status: 429 });
  }

  const parsed = attendeeRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event || !event.registrationEnabled || event.status === "ARCHIVED") {
    return NextResponse.json({ error: "Registration is not open for this event" }, { status: 400 });
  }

  const attendee = await prisma.attendee.create({
    data: {
      eventId: parsed.data.eventId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      selectedAllergens: stringifyStringArray(parsed.data.selectedAllergens),
      plusOneEnabled: parsed.data.plusOneEnabled ?? false,
      plusOneFirstName: parsed.data.plusOneFirstName,
      plusOneLastName: parsed.data.plusOneLastName,
      plusOneAllergens: stringifyStringArray(parsed.data.plusOneAllergens),
      under21: parsed.data.under21 ?? false,
      plusOneUnder21: parsed.data.plusOneEnabled ? parsed.data.plusOneUnder21 ?? false : false,
      ticketTier: parsed.data.ticketTier ?? "General",
      seat: parsed.data.seat,
      notes: parsed.data.notes,
      vip: parsed.data.vip ?? false,
      customAnswers: parsed.data.customAnswers ? JSON.stringify(parsed.data.customAnswers) : undefined
    }
  });

  const pass = await createPassForAttendee(attendee.id, attendee.eventId);
  const passUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/pass/${attendee.id}`;

  let emailStatus = "QUEUED";
  let providerId: string | undefined;
  let emailError: string | undefined;

  try {
    const branding = await getBranding();
    const delivery = await sendEmail({
      to: parsed.data.email,
      subject: `Your pass for ${event.name}`,
      html: renderPassEmail({
        name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        eventName: event.name,
        passUrl,
        fallbackCode: pass.fallbackCode,
        organizationName: branding.name,
        primaryColor: branding.primaryColor
      })
    });
    emailStatus = delivery.status;
    providerId = delivery.id;
  } catch (error) {
    emailStatus = "FAILED";
    emailError = error instanceof Error ? error.message : "Email delivery failed";
  }

  await prisma.emailLog.create({
    data: {
      eventId: event.id,
      attendeeId: attendee.id,
      recipient: parsed.data.email,
      type: "Digital pass",
      subject: `Your pass for ${event.name}`,
      providerId,
      status: emailStatus,
      error: emailError
    }
  });

  const created = await prisma.attendee.findUniqueOrThrow({
    where: { id: attendee.id },
    include: attendeeInclude
  });

  return NextResponse.json({
    attendee: serializeAttendee(created),
    fallbackCode: pass.fallbackCode,
    qrPayload: pass.qrPayload,
    passUrl,
    emailStatus,
    emailError
  }, { status: 201 });
}
