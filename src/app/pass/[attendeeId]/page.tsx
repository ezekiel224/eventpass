import { QrCode } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PassDownloadButton } from "@/components/pass/pass-download-button";
import { GlassCard } from "@/components/ui/card";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/prisma-helpers";
import { formatDate, formatTime } from "@/lib/utils";
import { createQrDataUrl } from "@/services/qr";

export const dynamic = "force-dynamic";

export default async function PassPage({ params }: { params: Promise<{ attendeeId: string }> }) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: {
      event: true,
      pass: true
    }
  });

  if (!attendee || !attendee.pass) {
    notFound();
  }

  const event = attendee.event;
  const branding = await getBranding();
  const qrDataUrl = await createQrDataUrl(JSON.parse(attendee.pass.qrPayload));
  const attendeeName = `${attendee.firstName} ${attendee.lastName}`;
  const selectedAllergens = parseStringArray(attendee.selectedAllergens);
  const plusOneName = attendee.plusOneEnabled ? `${attendee.plusOneFirstName ?? ""} ${attendee.plusOneLastName ?? ""}`.trim() : null;
  const under21Alert = attendee.under21 || attendee.plusOneUnder21;

  return (
    <main className="surface-grid grid min-h-screen place-items-center px-4 py-10">
      <GlassCard className="w-full max-w-lg overflow-hidden p-3">
        <div className="rounded-2xl border border-primary/20 bg-primary p-7 text-primary-foreground shadow-glow">
          {event.photoUrl ? (
            <div className="mb-6 h-44 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${event.photoUrl})` }} />
          ) : null}
          <p className="text-xs uppercase text-primary-foreground/70">{event.organizer}</p>
          <h1 className="mt-4 text-3xl font-semibold">{event.name}</h1>
          <div className="mt-10 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/12 p-5 backdrop-blur">
            <p className="text-sm text-primary-foreground/70">Attendee</p>
            <p className="text-3xl font-semibold">{attendeeName}</p>
            <p className="mt-1 text-primary-foreground/75">{attendee.ticketTier} {attendee.company ? `- ${attendee.company}` : ""}</p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2 text-sm text-primary-foreground/80">
              <p>{event.venue}</p>
              <p>{formatDate(event.startsAt)}</p>
              <p>{formatTime(event.startsAt)} - {formatTime(event.endsAt)}</p>
              <p>Fallback code: {attendee.pass.fallbackCode}</p>
              {selectedAllergens.length > 0 ? <p>Allergens: {selectedAllergens.join(", ")}</p> : null}
              {attendee.plusOneEnabled ? <p>Plus-one: {attendee.plusOneFirstName} {attendee.plusOneLastName}</p> : null}
            </div>
            <Image alt="Event pass QR code" className="rounded-2xl bg-white p-3" src={qrDataUrl} width={144} height={144} unoptimized />
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-card/80 p-5 sm:flex-row">
          {under21Alert ? (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive sm:flex-1">
              Under 21 alert for check-in
            </div>
          ) : null}
          <PassDownloadButton
            attendeeName={attendeeName}
            eventName={event.name}
            organizer={event.organizer}
            venue={event.venue}
            eventDate={formatDate(event.startsAt)}
            eventTime={`${formatTime(event.startsAt)} - ${formatTime(event.endsAt)}`}
            fallbackCode={attendee.pass.fallbackCode}
            ticketTier={attendee.ticketTier}
            company={attendee.company}
            selectedAllergens={selectedAllergens}
            plusOneName={plusOneName}
            under21Alert={under21Alert}
            qrDataUrl={qrDataUrl}
            primaryColor={branding.primaryColor}
            accentColor={branding.accentColor}
          />
          <details className="flex-1">
            <summary className="focus-ring inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold">
              <QrCode className="h-4 w-4" /> QR payload
            </summary>
            <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-muted p-3 text-xs">{attendee.pass.qrPayload}</pre>
          </details>
        </div>
      </GlassCard>
    </main>
  );
}
