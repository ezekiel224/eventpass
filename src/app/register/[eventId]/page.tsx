import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/register/register-form";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { getBranding } from "@/lib/branding";
import { parseRegistrationFields } from "@/lib/registration-fields";
import { MarkdownContent } from "@/components/ui/markdown-content";
import "./register-page.css";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { _count: { select: { attendees: { where: { status: "REGISTERED" } } } } } });

  if (!event || event.status === "ARCHIVED") {
    notFound();
  }
  const branding = await getBranding(event.organizationId);
  const deadlinePassed = Boolean(event.registrationDeadline && event.registrationDeadline < new Date());
  const atCapacity = event._count.attendees >= event.capacity;
  const registrationOpen = event.status === "PUBLISHED" && event.registrationEnabled && !deadlinePassed && (!atCapacity || event.waitlistEnabled);
  const closedReason = event.status !== "PUBLISHED"
    ? "Registration is not available while this event is in draft."
    : !event.registrationEnabled
      ? "Registration has been closed by the event organizer."
      : deadlinePassed
        ? "The registration deadline has passed."
        : "This event has reached capacity.";

  return (
    <main className="ep-public-register">
      <header className="ep-public-register-bar">
        <div className="ep-public-brand">{branding.logoUrl ? <Image src={branding.logoUrl} alt="" width={32} height={32} unoptimized /> : <span aria-hidden="true">{branding.name.slice(0, 1).toUpperCase()}</span>}<strong>{branding.name}</strong></div>
        <div className="ep-public-security"><ShieldCheck size={16} aria-hidden="true" /><span>Secure attendee registration</span></div>
      </header>

      <div className="ep-public-register-layout">
        <section className="ep-public-event" aria-labelledby="event-title">
          {event.photoUrl ? <div className="ep-public-event-image"><Image src={event.photoUrl} alt="" width={1200} height={760} unoptimized /></div> : null}
          <div className="ep-public-event-copy">
            <h1 id="event-title">{event.name}</h1>
            <MarkdownContent value={event.description} className="ep-public-event-description" />
          </div>
          <dl className="ep-public-event-facts">
            <div><dt><CalendarDays aria-hidden="true" /></dt><dd><strong>{formatDate(event.startsAt, branding.timezone)}</strong><span>Event date</span></dd></div>
            <div><dt><Clock3 aria-hidden="true" /></dt><dd><strong>{formatTime(event.startsAt, branding.timezone)}–{formatTime(event.endsAt, branding.timezone)}</strong><span>{branding.timezone.replaceAll("_", " ")}</span></dd></div>
            <div><dt><MapPin aria-hidden="true" /></dt><dd><strong>{event.venue}</strong><span>{event.address}</span></dd></div>
          </dl>
        </section>

        <section className="ep-public-enrollment" aria-labelledby="registration-title">
          <header><h2 id="registration-title">{atCapacity && event.waitlistEnabled ? "Join the waitlist" : "Register for your pass"}</h2><p>{atCapacity && event.waitlistEnabled ? "The event is full, but you can save your place on the waitlist." : "Complete the details below and we’ll create your personalized digital pass."}</p></header>
          <div className="ep-public-enrollment-body">
            {registrationOpen ? <RegisterForm eventId={event.id} registrationFields={parseRegistrationFields(event.registrationFields)} /> : <div className="ep-public-registration-closed" role="status"><strong>Registration unavailable</strong><span>{closedReason}</span></div>}
          </div>
        </section>
      </div>
      <footer className="ep-public-register-footer"><span>{event.organizer}</span><span>Registration details are shared with the event team.</span></footer>
    </main>
  );
}
