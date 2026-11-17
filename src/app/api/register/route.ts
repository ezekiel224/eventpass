import { NextRequest, NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { attendeeInclude, createPassForAttendee, serializeAttendee, stringifyStringArray } from "@/lib/prisma-helpers";
import { publicAttendeeRegistrationSchema } from "@/lib/validation";
import { createGoogleCalendarUrl, renderPassEmail, sendEmail } from "@/services/email";
import { getCommunicationTemplate, renderCommunicationTemplate } from "@/lib/communication-templates";
import { rateLimit } from "@/services/rate-limit";
import { formatDate, formatTime } from "@/lib/utils";
import { getPublicAppBaseUrl } from "@/lib/public-url";
import { mappedRegistrationAnswers, parseRegistrationFields, validateRegistrationAnswers, withRegistrationAnswerMetadata } from "@/lib/registration-fields";
import { normalizePersonName } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`register:${request.headers.get("x-forwarded-for") ?? "local"}`, 12);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many registrations from this source" }, { status: 429 });
  }

  const parsed = publicAttendeeRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event || !event.registrationEnabled || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Registration is not open for this event" }, { status: 400 });
  }
  if (event.registrationDeadline && event.registrationDeadline < new Date()) {
    return NextResponse.json({ error: "The registration deadline has passed" }, { status: 400 });
  }
  const registrationFields = parseRegistrationFields(event.registrationFields);
  const answerValidation = validateRegistrationAnswers(registrationFields, parsed.data.customAnswers);
  if (!answerValidation.valid) {
    return NextResponse.json({ error: "Complete the required registration questions.", fieldErrors: answerValidation.errors }, { status: 400 });
  }
  const mappedAnswers = mappedRegistrationAnswers(registrationFields, answerValidation.answers);
  const guestEnabled = mappedAnswers.guestStatus === "ADULT" || mappedAnswers.guestStatus === "UNDER_21";
  if (guestEnabled && (!parsed.data.plusOneFirstName || !parsed.data.plusOneLastName)) {
    return NextResponse.json({ error: "Enter the guest’s first and last name." }, { status: 400 });
  }
  const storedAnswers = withRegistrationAnswerMetadata(registrationFields, answerValidation.answers);
  const registrationCount = await prisma.attendee.count({ where: { eventId: event.id, status: "REGISTERED" } });
  const waitlisted = registrationCount >= event.capacity;
  if (waitlisted && !event.waitlistEnabled) {
    return NextResponse.json({ error: "This event has reached capacity" }, { status: 409 });
  }
  if (waitlisted && !mappedAnswers.email) {
    return NextResponse.json({ error: "The event waitlist is missing its required email question. Contact the event organizer." }, { status: 409 });
  }

  const attendee = await prisma.attendee.create({
    data: {
      eventId: parsed.data.eventId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: mappedAnswers.email || null,
      phone: mappedAnswers.phone,
      company: mappedAnswers.company,
      selectedAllergens: stringifyStringArray(mappedAnswers.selectedAllergens),
      selectedMenu: mappedAnswers.selectedMenu || null,
      plusOneEnabled: guestEnabled,
      plusOneFirstName: guestEnabled ? normalizePersonName(parsed.data.plusOneFirstName!) : null,
      plusOneLastName: guestEnabled ? normalizePersonName(parsed.data.plusOneLastName!) : null,
      plusOneAllergens: stringifyStringArray([]),
      plusOneMenu: null,
      under21: parsed.data.under21 ?? false,
      plusOneUnder21: mappedAnswers.guestStatus === "UNDER_21",
      ticketTier: "General",
      notes: null,
      customAnswers: JSON.stringify(storedAnswers),
      vip: false,
      status: waitlisted ? "WAITLIST" : "REGISTERED"
    }
  });

  if (waitlisted) {
    const created = await prisma.attendee.findUniqueOrThrow({ where: { id: attendee.id }, include: attendeeInclude });
    return NextResponse.json({ attendee: serializeAttendee(created), waitlisted: true }, { status: 201 });
  }

  const pass = await createPassForAttendee(attendee.id, attendee.eventId);
  const appBaseUrl = getPublicAppBaseUrl(request);
  const attendeePathId = encodeURIComponent(attendee.id);
  const passUrl = `${appBaseUrl}/pass/${attendeePathId}`;

  let emailStatus = mappedAnswers.email && event.emailConfirmationsEnabled ? "QUEUED" : "SKIPPED";
  let subject = `Your pass for ${event.name}`;
  let providerId: string | undefined;
  let emailError: string | undefined;

  if (mappedAnswers.email && event.emailConfirmationsEnabled) try {
    const branding = await getBranding();
    const template = await getCommunicationTemplate(event.organizationId, "PASS_CONFIRMATION", event.id);
    const rendered = renderCommunicationTemplate(template, {
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      eventName: event.name,
      eventDescription: event.description ?? "",
      eventDate: formatDate(event.startsAt, branding.timezone),
      eventTime: `${formatTime(event.startsAt, branding.timezone)} - ${formatTime(event.endsAt, branding.timezone)}`,
      venue: event.venue,
      address: event.address,
      ticketTier: attendee.ticketTier,
      seat: attendee.seat ?? "",
      organizer: event.organizer,
      contactEmail: event.contactEmail,
      organizationName: branding.name
    });
    subject = rendered.subject;
    const qrImageUrl = `${appBaseUrl}/api/pass/${attendeePathId}/qr`;
    const delivery = await sendEmail({
      to: mappedAnswers.email,
      subject,
      html: renderPassEmail({
        name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        eventName: event.name,
        eventDescription: event.description,
        venue: event.venue,
        address: event.address,
        eventDate: formatDate(event.startsAt, branding.timezone),
        eventTime: `${formatTime(event.startsAt, branding.timezone)} - ${formatTime(event.endsAt, branding.timezone)}`,
        ticketTier: attendee.ticketTier,
        seat: attendee.seat,
        organizer: event.organizer,
        contactEmail: event.contactEmail,
        passUrl,
        passDownloadUrl: `${appBaseUrl}/api/attendees/${attendeePathId}/pass-download`,
        googleCalendarUrl: createGoogleCalendarUrl({
          eventName: event.name,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          venue: event.venue,
          address: event.address,
          passUrl
        }),
        iCalendarUrl: `${appBaseUrl}/api/attendees/${attendeePathId}/calendar`,
        qrImageUrl,
        fallbackCode: pass.fallbackCode,
        messageHtml: rendered.bodyHtml,
        actionLabel: rendered.actionLabel,
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

  if (mappedAnswers.email && event.emailConfirmationsEnabled) {
    await prisma.emailLog.create({
      data: {
        eventId: event.id,
        attendeeId: attendee.id,
        recipient: mappedAnswers.email,
        type: "Digital pass",
        subject,
        providerId,
        status: emailStatus,
        error: emailError
      }
    });
  }

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
