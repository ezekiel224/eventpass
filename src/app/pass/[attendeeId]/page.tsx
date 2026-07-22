import { QrCode } from "lucide-react";
import { notFound } from "next/navigation";
import { PassDownloadButton } from "@/components/pass/pass-download-button";
import { CalendarButtons } from "@/components/pass/calendar-buttons";
import { PassExperience } from "@/components/pass/pass-experience";
import { isPassTheme } from "@/components/pass/pass-system";
import { GlassCard } from "@/components/ui/card";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { normalizeExistingPass } from "@/lib/pass-data";
import { parseStringArray } from "@/lib/prisma-helpers";
import { formatDate, formatTime } from "@/lib/utils";
import { createQrDataUrl } from "@/services/qr";

export const dynamic = "force-dynamic";

export default async function PassPage({
  params
}: {
  params: Promise<{ attendeeId: string }>;
}) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: { event: true, pass: true }
  });

  if (!attendee || !attendee.pass) notFound();

  const event = attendee.event;
  const branding = await getBranding();
  const qrDataUrl = await createQrDataUrl(JSON.parse(attendee.pass.qrPayload));
  const attendeeName = `${attendee.firstName} ${attendee.lastName}`;
  const selectedAllergens = parseStringArray(attendee.selectedAllergens);
  const plusOneAllergens = parseStringArray(attendee.plusOneAllergens);
  const plusOneName = attendee.plusOneEnabled ? `${attendee.plusOneFirstName ?? ""} ${attendee.plusOneLastName ?? ""}`.trim() || null : null;
  const under21Alert = attendee.under21 || attendee.plusOneUnder21;
  const eventTheme = isPassTheme(event.passTheme) ? event.passTheme : "minimal";
  const passData = normalizeExistingPass({
    event: {
      name: event.name,
      description: event.description,
      venue: event.venue,
      address: event.address,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      organizer: event.organizer,
      photoUrl: event.photoUrl,
      bannerImageUrl: event.bannerImageUrl,
      logoUrl: event.logoUrl
    },
    attendee: {
      name: attendeeName,
      company: attendee.company,
      ticketTier: attendee.ticketTier,
      vip: attendee.vip,
      raffleTickets: attendee.raffleTickets,
      seat: attendee.seat,
      status: attendee.status,
      plusOneName,
      selectedAllergens,
      plusOneAllergens,
      under21Alert
    },
    pass: { id: attendee.pass.id, fallbackCode: attendee.pass.fallbackCode },
    branding,
    qrDataUrl
  });

  return (
    <main className="surface-grid min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-3xl justify-items-center gap-6">
        <PassExperience data={passData} theme={eventTheme} />

        <GlassCard className="w-full max-w-xl overflow-hidden p-4 sm:p-5">
          {under21Alert ? (
            <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              Age verification required at check-in
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
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
            <CalendarButtons
              attendeeId={attendee.id}
              eventName={event.name}
              startsAt={event.startsAt.toISOString()}
              endsAt={event.endsAt.toISOString()}
              venue={event.venue}
              address={event.address}
            />
            <details className="sm:col-span-2">
              <summary className="focus-ring inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold">
                <QrCode className="h-4 w-4" /> QR payload
              </summary>
              <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-muted p-3 text-xs">{attendee.pass.qrPayload}</pre>
            </details>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
