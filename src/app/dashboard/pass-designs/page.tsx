import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { PassThemePreview } from "@/components/pass/pass-theme-preview";
import { NormalizedPassData } from "@/components/pass/pass-system";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { normalizeExistingPass } from "@/lib/pass-data";
import { parseStringArray } from "@/lib/prisma-helpers";
import { createQrDataUrl } from "@/services/qr";
import { requirePermission } from "@/lib/authorization";

async function previewData(organizationId: string): Promise<NormalizedPassData> {
  const [branding, attendee] = await Promise.all([
    getBranding(organizationId),
    prisma.attendee.findFirst({ where: { event: { organizationId } }, include: { event: true, pass: true }, orderBy: { createdAt: "desc" } })
  ]);

  if (!attendee?.pass) {
    return {
      eventName: "Add an attendee to preview an event pass",
      eventSubtitle: null,
      eventDate: "Date unavailable",
      eventTime: "Time unavailable",
      venueName: "Venue unavailable",
      venueLocation: null,
      gate: null,
      attendeeName: "Preview attendee",
      attendeePhoto: null,
      company: null,
      passId: "No pass available",
      fallbackCode: null,
      passType: "General",
      accessLevel: null,
      raffleTickets: null,
      perks: [],
      qrDataUrl: null,
      organizerName: branding.name,
      organizerLogo: branding.logoUrl,
      sponsorLogos: [],
      accentColor: branding.primaryColor,
      secondaryColor: branding.accentColor,
      backgroundImage: null,
      customMessage: null,
      status: null,
      companionName: null,
      advisories: [],
      menuSelections: [],
      under21Alert: false
    };
  }

  const event = attendee.event;
  const selectedAllergens = parseStringArray(attendee.selectedAllergens);
  const plusOneAllergens = parseStringArray(attendee.plusOneAllergens);
  const plusOneName = attendee.plusOneEnabled ? `${attendee.plusOneFirstName ?? ""} ${attendee.plusOneLastName ?? ""}`.trim() || null : null;
  const qrDataUrl = await createQrDataUrl(JSON.parse(attendee.pass.qrPayload));

  return normalizeExistingPass({
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
      name: `${attendee.firstName} ${attendee.lastName}`,
      company: attendee.company,
      ticketTier: attendee.ticketTier,
      vip: attendee.vip,
      raffleTickets: attendee.raffleTickets,
      seat: attendee.seat,
      status: attendee.status,
      plusOneName,
      selectedAllergens,
      plusOneAllergens,
      selectedMenu: attendee.selectedMenu,
      plusOneMenu: attendee.plusOneMenu,
      under21Alert: attendee.under21 || attendee.plusOneUnder21
    },
    pass: { id: attendee.pass.id, fallbackCode: attendee.pass.fallbackCode },
    branding,
    qrDataUrl
  });
}

export default async function PassDesignsPage() {
  const authorization = await requirePermission("passes:manage");
  const data = await previewData(authorization.organization.id);
  return (
    <AppShell active="Pass Designs">
      <PageTitle title="Pass Designs" />
      <PassThemePreview baseData={data} />
    </AppShell>
  );
}
