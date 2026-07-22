import { NormalizedPassData, safePassAsset, safePassColor } from "@/components/pass/pass-system";
import { formatDate, formatTime } from "@/lib/utils";

type ExistingPassSource = {
  event: {
    name: string;
    description: string;
    venue: string;
    address: string;
    startsAt: Date;
    endsAt: Date;
    organizer: string;
    photoUrl: string | null;
    bannerImageUrl: string | null;
    logoUrl: string | null;
  };
  attendee: {
    name: string;
    company: string | null;
    ticketTier: string;
    vip: boolean;
    raffleTickets: number;
    seat: string | null;
    status: string;
    plusOneName: string | null;
    selectedAllergens: string[];
    plusOneAllergens: string[];
    under21Alert: boolean;
  };
  pass: {
    id: string;
    fallbackCode: string;
  };
  branding: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
  };
  qrDataUrl: string | null;
};

export function normalizeExistingPass(source: ExistingPassSource): NormalizedPassData {
  const advisories = [
    ...source.attendee.selectedAllergens,
    ...source.attendee.plusOneAllergens.map((allergen) => `Companion: ${allergen}`)
  ];

  return {
    eventName: source.event.name,
    eventSubtitle: null,
    eventDate: formatDate(source.event.startsAt),
    eventTime: `${formatTime(source.event.startsAt)} – ${formatTime(source.event.endsAt)}`,
    venueName: source.event.venue,
    venueLocation: source.event.address || null,
    gate: source.attendee.seat,
    attendeeName: source.attendee.name,
    attendeePhoto: null,
    company: source.attendee.company,
    passId: source.pass.id,
    fallbackCode: source.pass.fallbackCode,
    passType: source.attendee.vip ? "VIP" : source.attendee.ticketTier,
    accessLevel: source.attendee.ticketTier || null,
    raffleTickets: source.attendee.raffleTickets,
    perks: [],
    qrDataUrl: source.qrDataUrl,
    organizerName: source.event.organizer || source.branding.name,
    organizerLogo: safePassAsset(source.event.logoUrl) ?? safePassAsset(source.branding.logoUrl),
    sponsorLogos: [],
    accentColor: safePassColor(source.branding.primaryColor, "#14f1cc"),
    secondaryColor: safePassColor(source.branding.accentColor, "#7c3aed"),
    backgroundImage: safePassAsset(source.event.bannerImageUrl) ?? safePassAsset(source.event.photoUrl),
    customMessage: source.event.description || null,
    status: source.attendee.status || null,
    companionName: source.attendee.plusOneName,
    advisories,
    under21Alert: source.attendee.under21Alert
  };
}
