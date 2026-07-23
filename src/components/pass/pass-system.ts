export const passThemeIds = ["casino", "gala", "ice-cream", "retro-arcade", "science", "biology", "space", "minimal"] as const;

export type PassThemeId = (typeof passThemeIds)[number];
export type PassFace = "front" | "back";
export type GenericVariant = "light" | "dark";

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
  under21Alert: boolean;
};

export type PassThemeDefinition = {
  id: PassThemeId;
  label: string;
  shortLabel: string;
  description: string;
};

export const passThemeRegistry: Record<PassThemeId, PassThemeDefinition> = {
  casino: {
    id: "casino",
    label: "Casino Night",
    shortLabel: "Casino",
    description: "Velvet, lacquer, gold leaf, and an interactive roulette wheel."
  },
  gala: {
    id: "gala",
    label: "Fancy Gala",
    shortLabel: "Gala",
    description: "Editorial black-tie typography with responsive foil and Art Deco linework."
  },
  "ice-cream": {
    id: "ice-cream",
    label: "Ice Cream Social",
    shortLabel: "Social",
    description: "A polished pastel-parlor pass with raised lettering, scalloped trim, and playful printed sprinkles."
  },
  "retro-arcade": {
    id: "retro-arcade",
    label: "Retro Game Night",
    shortLabel: "Arcade",
    description: "A neon CRT credential with sprites, tokens, and high-score details."
  },
  science: {
    id: "science",
    label: "General Science",
    shortLabel: "Science",
    description: "A secure research credential with atoms, waveforms, and instrument panels."
  },
  biology: {
    id: "biology",
    label: "Biology",
    shortLabel: "Biology",
    description: "Layered living systems, bioluminescence, cells, and a DNA helix."
  },
  space: {
    id: "space",
    label: "Space",
    shortLabel: "Space",
    description: "A cinematic mission credential with stellar parallax and orbital depth."
  },
  minimal: {
    id: "minimal",
    label: "Clean Generic",
    shortLabel: "Minimal",
    description: "A flexible production-safe pass with crisp hierarchy and restrained depth."
  }
};

export function isPassTheme(value: string | null | undefined): value is PassThemeId {
  return passThemeIds.includes(value as PassThemeId);
}

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
