import { getDefaultOrganization } from "@/lib/prisma-helpers";
import { cache } from "react";

export const SYSTEM_ACCENT_COLOR = "#315CF5";

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
      timezone: organization.timezone
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback branding because organization settings are unavailable.", error);
    }
    return fallbackBranding;
  }
});
