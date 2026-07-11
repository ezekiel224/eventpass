import { prisma } from "@/lib/db";
import { hexToHslParts } from "@/lib/color";
import { getDefaultOrganization } from "@/lib/prisma-helpers";

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

export async function getBranding(): Promise<Branding> {
  try {
    const organization = await getDefaultOrganization();
    const fresh = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });

    return {
      name: fresh.name,
      logoUrl: fresh.logoUrl,
      primaryColor: fresh.primaryColor,
      accentColor: fresh.accentColor,
      primaryHsl: hexToHslParts(fresh.primaryColor, fallbackBranding.primaryHsl),
      accentHsl: hexToHslParts(fresh.accentColor, fallbackBranding.accentHsl)
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using fallback branding because organization settings are unavailable.", error);
    }
    return fallbackBranding;
  }
}
