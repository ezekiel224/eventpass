import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  communicationTemplateDefinitions,
  getCommunicationTemplate,
  isCommunicationTemplateKey,
  unsupportedTemplateVariables
} from "@/lib/communication-templates";
import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/prisma-helpers";

const templateSchema = z.object({
  key: z.string().min(1),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  actionLabel: z.string().trim().min(1).max(80)
});

export const dynamic = "force-dynamic";

export async function GET() {
  const organization = await getDefaultOrganization();
  const templates = await Promise.all(
    Object.keys(communicationTemplateDefinitions).map((key) => getCommunicationTemplate(organization.id, key as keyof typeof communicationTemplateDefinitions))
  );
  return NextResponse.json({ templates });
}

export async function PATCH(request: NextRequest) {
  const parsed = templateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a subject, message, and button label within the allowed lengths." }, { status: 400 });
  }
  if (!isCommunicationTemplateKey(parsed.data.key)) {
    return NextResponse.json({ error: "That communication template does not exist." }, { status: 404 });
  }

  const unsupported = unsupportedTemplateVariables(parsed.data.key, parsed.data.subject, parsed.data.body, parsed.data.actionLabel);
  if (unsupported.length) {
    return NextResponse.json({ error: `Unsupported variable${unsupported.length === 1 ? "" : "s"}: ${unsupported.map((variable) => `{{${variable}}}`).join(", ")}` }, { status: 400 });
  }

  const organization = await getDefaultOrganization();
  await prisma.communicationTemplate.upsert({
    where: { organizationId_key: { organizationId: organization.id, key: parsed.data.key } },
    update: { subject: parsed.data.subject, body: parsed.data.body, actionLabel: parsed.data.actionLabel },
    create: { organizationId: organization.id, key: parsed.data.key, subject: parsed.data.subject, body: parsed.data.body, actionLabel: parsed.data.actionLabel }
  });

  return NextResponse.json({ template: await getCommunicationTemplate(organization.id, parsed.data.key) });
}
