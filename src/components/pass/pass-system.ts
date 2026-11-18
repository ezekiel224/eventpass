export type NormalizedPassData = {
  eventName: string;
  eventSubtitle: string | null;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueLocation: string | null;
  gate: string | null;
  attendeeName: string;
  attendeePhoto: string | null;
  company: string | null;
  passId: string;
  fallbackCode: string | null;
  passType: string;
  accessLevel: string | null;
  raffleTickets: number | null;
  perks: string[];
  qrDataUrl: string | null;
  organizerName: string;
  organizerLogo: string | null;
  sponsorLogos: Array<{ name: string; url: string }>;
  accentColor: string;
  secondaryColor: string;
  backgroundImage: string | null;
  customMessage: string | null;
  status: string | null;
  companionName: string | null;
  advisories: string[];
  menuSelections: string[];
  under21Alert: boolean;
};

export function safePassColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export function safePassAsset(value: string | null | undefined) {
  if (!value) return null;
  if (/^\/(?!\/)[a-z0-9/_\-.]+(?:\?[a-z0-9=&%_\-.]*)?$/i.test(value)) return value;
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
