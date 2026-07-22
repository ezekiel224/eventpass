import { QrCode, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { PassDownloadButton } from "@/components/pass/pass-download-button";
import { CalendarButtons } from "@/components/pass/calendar-buttons";
import { PassExperience } from "@/components/pass/pass-experience";
import { isPassTheme } from "@/components/pass/pass-system";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { normalizeExistingPass } from "@/lib/pass-data";
import { parseStringArray } from "@/lib/prisma-helpers";
import { formatDate, formatTime } from "@/lib/utils";
import { createQrDataUrl } from "@/services/qr";
import styles from "@/app/pass/[attendeeId]/pass-page.module.css";

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
    <main className={styles.passPage} data-pass-theme={eventTheme}>
      <div className={styles.content}>
        <PassExperience data={passData} theme={eventTheme} />

        <section className={styles.actionDock} aria-label="Pass actions">
          {under21Alert ? (
            <div className={styles.ageAlert}>
              Age verification required at check-in
            </div>
          ) : null}
          <div className={styles.actionHeader}>
            <p>Keep your credential close</p>
            <span className={styles.secureLabel}><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
          </div>
          <div className={styles.actionGrid}>
            <PassDownloadButton
              className={styles.primaryAction}
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
              className={styles.calendarGroup}
              attendeeId={attendee.id}
              eventName={event.name}
              startsAt={event.startsAt.toISOString()}
              endsAt={event.endsAt.toISOString()}
              venue={event.venue}
              address={event.address}
            />
          </div>
          <details className={styles.payload}>
            <summary className="focus-ring"><QrCode className="h-3.5 w-3.5" /> Verification data</summary>
            <pre>{attendee.pass.qrPayload}</pre>
          </details>
        </section>
      </div>
    </main>
  );
}
