import { cache } from "react";
import { prisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";

export const SYSTEM_ACCENT_COLOR = "#315CF5";
export type Branding = { name: string; logoUrl: string | null; primaryColor: string; accentColor: string; timezone: string };
const fallbackBranding: Branding = { name: "EventPass", logoUrl: null, primaryColor: SYSTEM_ACCENT_COLOR, accentColor: SYSTEM_ACCENT_COLOR, timezone: "America/Chicago" };

export const getBranding = cache(async (organizationId?: string): Promise<Branding> => {
  try {
    const tenant = organizationId ? null : await getTenantContext();
    const id = organizationId ?? tenant?.organization.id;
    if (!id) return fallbackBranding;
    const organization = await prisma.organization.findUnique({ where: { id } });
    if (!organization) return fallbackBranding;
    return { name: organization.name, logoUrl: organization.logoUrl, primaryColor: SYSTEM_ACCENT_COLOR, accentColor: SYSTEM_ACCENT_COLOR, timezone: organization.timezone };
  } catch {
    return fallbackBranding;
  }
});
