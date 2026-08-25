import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/register/register-form";
import { Card, GlassCard } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/prisma-helpers";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { _count: { select: { attendees: { where: { status: { not: "WAITLIST" } } } } } } });

  if (!event || event.status === "ARCHIVED") {
    notFound();
  }
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
    <main className="public-shell px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
      <div className="flex flex-col justify-center">
        <GlassCard className="animate-fade-up overflow-hidden p-0">
          {event.photoUrl ? (
            <div className="relative h-64 bg-cover bg-center sm:h-80" style={{ backgroundImage: `url(${event.photoUrl})` }}><div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" /></div>
          ) : null}
          <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-xs font-semibold text-primary"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.startsAt)}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Secure registration</span>
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">{event.name}</h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">{event.description}</p>
          <div className="control-panel mt-7 flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary"><MapPin className="h-4 w-4" /></span>
            <div><p className="font-semibold">{event.venue}</p><p className="mt-1 text-sm text-muted-foreground">{event.address}</p></div>
          </div>
          </div>
        </GlassCard>
      </div>
      <Card className="animate-fade-up self-center overflow-hidden p-0">
        <div className="border-b border-border/60 px-6 py-6 sm:px-8"><p className="panel-label">Attendee enrollment</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{atCapacity && event.waitlistEnabled ? "Join the waitlist" : "Register for your pass"}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{atCapacity && event.waitlistEnabled ? "The event is full, but you can register for the waitlist." : "Your personalized QR pass is generated after registration."}</p></div>
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        {registrationOpen ? <RegisterForm eventId={event.id} allergenOptions={parseStringArray(event.allergenOptions)} menuOptions={parseStringArray(event.menuOptions)} /> : <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{closedReason}</div>}
        </div>
      </Card>
      </div>
    </main>
  );
}
