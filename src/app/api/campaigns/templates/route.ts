import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communicationTemplateDefinitions, eventCommunicationTemplateKey, getCommunicationTemplate, isCommunicationTemplateKey, unsupportedTemplateVariables } from "@/lib/communication-templates";
import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/prisma-helpers";
import { authorizeApi } from "@/lib/authorization";
import { auditLogData } from "@/lib/audit";

const templateSchema = z.object({
  key: z.string().min(1),
  eventId: z.string().min(1).nullable().optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  actionLabel: z.string().trim().min(1).max(80)
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const organization = await getDefaultOrganization();
  const events = await prisma.event.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { startsAt: "asc" }, select: { id: true, name: true } });
  const registrationTemplates = await Promise.all(events.map(async (event) => ({
    ...await getCommunicationTemplate(organization.id, "PASS_CONFIRMATION", event.id),
    eventId: event.id,
    eventName: event.name
  })));
  const prizeTemplate = await getCommunicationTemplate(organization.id, "PRIZE_ACCEPTANCE");
  return NextResponse.json({ templates: [...registrationTemplates, { ...prizeTemplate, eventId: null, eventName: "All events" }] });
}

export async function PATCH(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const parsed = templateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a subject, message, and button label within the allowed lengths." }, { status: 400 });
  if (!isCommunicationTemplateKey(parsed.data.key)) return NextResponse.json({ error: "That communication template does not exist." }, { status: 404 });
  if (parsed.data.key === "PASS_CONFIRMATION" && !parsed.data.eventId) return NextResponse.json({ error: "Choose an event for this registration message." }, { status: 400 });

  const unsupported = unsupportedTemplateVariables(parsed.data.key, parsed.data.subject, parsed.data.body, parsed.data.actionLabel);
  if (unsupported.length) return NextResponse.json({ error: `Unsupported variable${unsupported.length === 1 ? "" : "s"}: ${unsupported.map((variable) => `{{${variable}}}`).join(", ")}` }, { status: 400 });

  const organization = await getDefaultOrganization();
  if (parsed.data.eventId) {
    const event = await prisma.event.findFirst({ where: { id: parsed.data.eventId, organizationId: organization.id }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const storageKey = parsed.data.eventId ? eventCommunicationTemplateKey(parsed.data.key, parsed.data.eventId) : parsed.data.key;
  await prisma.$transaction(async (transaction) => {
    await transaction.communicationTemplate.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: storageKey } },
      update: { subject: parsed.data.subject, body: parsed.data.body, actionLabel: parsed.data.actionLabel },
      create: { organizationId: organization.id, key: storageKey, subject: parsed.data.subject, body: parsed.data.body, actionLabel: parsed.data.actionLabel }
    });
    await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, actor: access.authorization.user, action: "campaign.template.updated", targetType: "CommunicationTemplate", targetId: storageKey, metadata: { key: parsed.data.key, eventId: parsed.data.eventId ?? null } }) });
  });
  const definition = communicationTemplateDefinitions[parsed.data.key];
  return NextResponse.json({ template: { ...await getCommunicationTemplate(organization.id, parsed.data.key, parsed.data.eventId ?? undefined), eventId: parsed.data.eventId ?? null, eventName: parsed.data.eventId ? (await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { name: true } }))?.name ?? "Event" : "All events", variables: definition.variables } });
}
