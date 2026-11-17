import { getDefaultOrganization } from "@/lib/prisma-helpers";
import { cache } from "react";
import { isValidTimeZone } from "@/lib/utils";

export const SYSTEM_ACCENT_COLOR = "#0FC56A";

export type Branding = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  timezone: string;
};

const fallbackBranding: Branding = {
  name: "EventPass",
  logoUrl: null,
  primaryColor: SYSTEM_ACCENT_COLOR,
  accentColor: SYSTEM_ACCENT_COLOR,
  timezone: "America/Chicago"
};

export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const organization = await getDefaultOrganization();

    return {
      name: organization.name,
      logoUrl: organization.logoUrl,
      primaryColor: SYSTEM_ACCENT_COLOR,
      accentColor: SYSTEM_ACCENT_COLOR,
      timezone: isValidTimeZone(organization.timezone) ? organization.timezone : fallbackBranding.timezone
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback branding because organization settings are unavailable.", error);
    }
    return fallbackBranding;
  }
});
