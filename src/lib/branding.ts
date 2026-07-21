import { hexToHslParts } from "@/lib/color";
import { getDefaultOrganization } from "@/lib/prisma-helpers";
import { cache } from "react";

export type Branding = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  primaryHsl: string;
  accentHsl: string;
};

const fallbackBranding: Branding = {
  name: "EventPass",
  logoUrl: null,
  primaryColor: "#14f1cc",
  accentColor: "#14f1cc",
  primaryHsl: "168 92% 48%",
  accentHsl: "168 92% 48%"
};

export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const organization = await getDefaultOrganization();

    return {
      name: organization.name,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
      accentColor: organization.accentColor,
      primaryHsl: hexToHslParts(organization.primaryColor, fallbackBranding.primaryHsl),
      accentHsl: hexToHslParts(organization.accentColor, fallbackBranding.accentHsl)
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback branding because organization settings are unavailable.", error);
    }
    return fallbackBranding;
  }
});
