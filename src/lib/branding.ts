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

export async function getBranding(): Promise<Branding> {
  const organization = await getDefaultOrganization();
  const fresh = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });

  return {
    name: fresh.name,
    logoUrl: fresh.logoUrl,
    primaryColor: fresh.primaryColor,
    accentColor: fresh.accentColor,
    primaryHsl: hexToHslParts(fresh.primaryColor, "168 92% 48%"),
    accentHsl: hexToHslParts(fresh.accentColor, "168 92% 48%")
  };
}
