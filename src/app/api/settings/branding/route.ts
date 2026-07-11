import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultOrganization } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/db";

const brandingSchema = z.object({
  name: z.string().min(2).max(120),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a valid hex color like #14f1cc"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a valid hex color like #14f1cc"),
  timezone: z.string().min(2).max(80),
  domain: z.string().max(160).optional()
});

export const dynamic = "force-dynamic";

export async function GET() {
  const organization = await getDefaultOrganization();

  return NextResponse.json({
    organization,
    email: {
      provider: process.env.EMAIL_PROVIDER ?? "console",
      from: process.env.EMAIL_FROM ?? "",
      resendConfigured: Boolean(process.env.RESEND_API_KEY)
    }
  });
}

export async function PATCH(request: NextRequest) {
  const parsed = brandingSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organization = await getDefaultOrganization();
  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data: {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || null,
      primaryColor: parsed.data.primaryColor,
      accentColor: parsed.data.accentColor,
      timezone: parsed.data.timezone,
      domain: parsed.data.domain || null
    }
  });

  return NextResponse.json({ organization: updated });
}
