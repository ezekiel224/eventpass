import { prisma } from "@/lib/db";

export const communicationTemplateDefinitions = {
  PASS_CONFIRMATION: {
    name: "Registration confirmation",
    description: "Sent after registration and when an operator resends a guest's pass.",
    subject: "Your pass for {{eventName}}",
    body: "Hi {{name}},\n\nThank you for registering for {{eventName}}. Your digital event pass is ready. Keep this email handy and present the QR code at check-in.\n\n{{eventDescription}}",
    actionLabel: "Open digital pass",
    variables: [
      ["name", "Guest name", "Jordan Lee"],
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
      ["organizationName", "Organization", "EventPass"]
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
      ["organizationName", "Organization", "EventPass"]
    ]
  }
} as const;

export type CommunicationTemplateKey = keyof typeof communicationTemplateDefinitions;
export type TemplateVariable = readonly [key: string, label: string, sample: string];

export function isCommunicationTemplateKey(value: string): value is CommunicationTemplateKey {
  return value in communicationTemplateDefinitions;
}

export function unsupportedTemplateVariables(key: CommunicationTemplateKey, ...values: string[]) {
  const supported = new Set<string>(communicationTemplateDefinitions[key].variables.map(([variable]) => variable));
  const used = values.flatMap((value) => Array.from(value.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g), (match) => match[1]));
  return [...new Set(used.filter((variable) => !supported.has(variable)))];
}

export async function getCommunicationTemplate(organizationId: string, key: CommunicationTemplateKey) {
  const saved = await prisma.communicationTemplate.findUnique({
    where: { organizationId_key: { organizationId, key } }
  });
  const definition = communicationTemplateDefinitions[key];

  return {
    key,
    name: definition.name,
    description: definition.description,
    subject: saved?.subject ?? definition.subject,
    body: saved?.body ?? definition.body,
    actionLabel: saved?.actionLabel ?? definition.actionLabel,
    variables: definition.variables
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function interpolate(template: string, variables: Record<string, string>, html: boolean) {
  let result = "";
  let cursor = 0;
  const matches = template.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g);
  for (const match of matches) {
    const index = match.index ?? 0;
    const literal = template.slice(cursor, index);
    const value = variables[match[1]] ?? "";
    result += html ? escapeHtml(literal) + escapeHtml(value) : literal + value;
    cursor = index + match[0].length;
  }
  result += html ? escapeHtml(template.slice(cursor)) : template.slice(cursor);
  return html ? result.replace(/\r?\n/g, "<br>") : result.replace(/[\r\n]+/g, " ").trim();
}

export function renderCommunicationTemplate(
  template: { subject: string; body: string; actionLabel: string },
  variables: Record<string, string>
) {
  return {
    subject: interpolate(template.subject, variables, false),
    bodyHtml: interpolate(template.body, variables, true),
    actionLabel: interpolate(template.actionLabel, variables, false)
  };
}
