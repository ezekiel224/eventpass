import { prisma } from "@/lib/db";
import { markdownToHtml } from "@/lib/markdown";

export const communicationTemplateDefinitions = {
  PASS_CONFIRMATION: {
    name: "Thank you for registering",
    description: "Sent after registration and when an operator resends a guest's pass.",
    subject: "Thank you for registering for {{eventName}}",
    body: "Hi **{{firstName}}**,\n\nThank you for registering for **{{eventName}}**. Your digital event pass is ready. Keep this email handy and present the QR code at check-in.\n\n{{eventDescription}}",
    actionLabel: "Open digital pass",
    variables: [
      ["name", "Full name", "Jordan Lee"],
      ["firstName", "First name", "Jordan"],
      ["lastName", "Last name", "Lee"],
      ["eventName", "Event name", "Annual Celebration"],
      ["eventDescription", "Event description", "An evening celebrating our team and community."],
      ["eventDate", "Event date", "Friday, October 16, 2026"],
      ["eventTime", "Event time", "6:00 PM - 10:00 PM"],
      ["venue", "Venue", "The Grand Hall"],
      ["address", "Address", "100 Main Street, Chicago, IL"],
      ["ticketTier", "Ticket tier", "General"],
      ["seat", "Seat", "Table 12"],
      ["organizer", "Organizer", "Events Team"],
      ["contactEmail", "Contact email", "events@example.com"],
      ["organizationName", "Organization", "Praxis"]
    ]
  },
  PRIZE_ACCEPTANCE: {
    name: "Prize acceptance",
    description: "Sent to a raffle winner when their secure receipt is ready to sign.",
    subject: "Signature required for your {{prizeName}} prize",
    body: "Hi {{name}},\n\nYou won {{prizeName}}{{prizeValue}} at {{eventName}}. Please review the tax acknowledgment and sign the prize receipt. The secure link expires in {{expirationDays}} days.\n\nIf you did not win this prize, contact {{contactEmail}}.",
    actionLabel: "Review and sign",
    variables: [
      ["name", "Winner name", "Jordan Lee"],
      ["eventName", "Event name", "Annual Celebration"],
      ["prizeName", "Prize name", "Weekend getaway"],
      ["prizeValue", "Prize value", " with a fair-market value of $750"],
      ["expirationDays", "Expiration period", "30"],
      ["contactEmail", "Contact email", "events@example.com"],
      ["organizationName", "Organization", "Praxis"]
    ]
  }
} as const;

export type CommunicationTemplateKey = keyof typeof communicationTemplateDefinitions;
export type TemplateVariable = readonly [key: string, label: string, sample: string];

export function eventCommunicationTemplateKey(key: CommunicationTemplateKey, eventId: string) {
  return `${key}:${eventId}`;
}

export function isCommunicationTemplateKey(value: string): value is CommunicationTemplateKey {
  return value in communicationTemplateDefinitions;
}

export function unsupportedTemplateVariables(key: CommunicationTemplateKey, ...values: string[]) {
  const supported = new Set<string>(communicationTemplateDefinitions[key].variables.map(([variable]) => variable));
  const used = values.flatMap((value) => Array.from(value.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g), (match) => match[1]));
  return [...new Set(used.filter((variable) => !supported.has(variable)))];
}

export async function getCommunicationTemplate(organizationId: string, key: CommunicationTemplateKey, eventId?: string) {
  const scopedKey = eventId ? eventCommunicationTemplateKey(key, eventId) : key;
  const saved = await prisma.communicationTemplate.findUnique({ where: { organizationId_key: { organizationId, key: scopedKey } } });
  const fallback = eventId && !saved ? await prisma.communicationTemplate.findUnique({ where: { organizationId_key: { organizationId, key } } }) : null;
  const definition = communicationTemplateDefinitions[key];

  return {
    key,
    name: definition.name,
    description: definition.description,
    subject: saved?.subject ?? fallback?.subject ?? definition.subject,
    body: saved?.body ?? fallback?.body ?? definition.body,
    actionLabel: saved?.actionLabel ?? fallback?.actionLabel ?? definition.actionLabel,
    variables: definition.variables
  };
}

function interpolate(template: string, variables: Record<string, string>) {
  let result = "";
  let cursor = 0;
  const matches = template.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g);
  for (const match of matches) {
    const index = match.index ?? 0;
    const literal = template.slice(cursor, index);
    const value = variables[match[1]] ?? "";
    result += literal + value;
    cursor = index + match[0].length;
  }
  return result + template.slice(cursor);
}

export function renderCommunicationTemplate(
  template: { subject: string; body: string; actionLabel: string },
  variables: Record<string, string>
) {
  return {
    subject: interpolate(template.subject, variables).replace(/[\r\n]+/g, " ").trim(),
    bodyHtml: markdownToHtml(interpolate(template.body, variables)),
    actionLabel: interpolate(template.actionLabel, variables).replace(/[\r\n]+/g, " ").trim()
  };
}
