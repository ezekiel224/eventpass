import { notFound } from "next/navigation";
import { LivePassExperience } from "@/components/pass/live-pass-experience";
import { isPassTheme } from "@/components/pass/pass-system";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { normalizeExistingPass } from "@/lib/pass-data";
import { parseStringArray } from "@/lib/prisma-helpers";
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
    include: {
      event: true,
      pass: true,
      raffleEntries: {
        where: { prize: { status: "ACTIVE" } },
        select: { ticketCount: true }
      }
    }
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
  const remainingRaffleTickets = Math.max(
    0,
    attendee.raffleTickets - attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0)
  );
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
      raffleTickets: remainingRaffleTickets,
      seat: attendee.seat,
      status: attendee.status,
      plusOneName,
      selectedAllergens,
      plusOneAllergens,
      selectedMenu: attendee.selectedMenu,
      plusOneMenu: attendee.plusOneMenu,
      under21Alert
    },
    pass: { id: attendee.pass.id, fallbackCode: attendee.pass.fallbackCode },
    branding,
    qrDataUrl
  });

  return (
    <main className={styles.passPage} data-pass-theme={eventTheme}>
      <div className={styles.content}>
        <LivePassExperience attendeeId={attendee.id} initialData={passData} theme={eventTheme} />
      </div>
    </main>
  );
}
