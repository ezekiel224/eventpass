import { z } from "zod";

export const registrationFieldTypes = ["TEXT", "TEXTAREA", "SELECT", "MULTISELECT", "CHECKBOX", "GUEST"] as const;
export const registrationFieldMappings = ["EMAIL", "PHONE", "WORK_CENTER", "MENU", "ALLERGENS", "GUEST"] as const;

export const registrationFieldSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/i),
  label: z.string().trim().min(2).max(120),
  type: z.enum(registrationFieldTypes),
  required: z.boolean().default(false),
  helpText: z.string().trim().max(240).optional().default(""),
  options: z.array(z.string().trim().min(1).max(100)).max(30).optional().default([]),
  mapping: z.enum(registrationFieldMappings).optional()
}).superRefine((field, context) => {
  if ((field.type === "SELECT" || field.type === "MULTISELECT") && field.options.length < 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Choice fields need at least two options." });
  }
  const normalizedOptions = field.options.map((option) => option.toLocaleLowerCase());
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Choice options must be unique." });
  }
  const requiredType = field.mapping === "ALLERGENS"
    ? "MULTISELECT"
    : field.mapping === "GUEST"
      ? "GUEST"
    : field.mapping === "WORK_CENTER" || field.mapping === "MENU"
      ? "SELECT"
      : field.mapping === "EMAIL" || field.mapping === "PHONE"
        ? "TEXT"
        : null;
  if (requiredType && field.type !== requiredType) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["type"], message: `This connected field must remain ${requiredType.toLocaleLowerCase()}.` });
  }
  if (field.type === "GUEST" && field.required) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["required"], message: "Guest add-ons cannot require an attendee to bring a guest." });
  }
});

export const registrationFieldsSchema = z.array(registrationFieldSchema).max(30).superRefine((fields, context) => {
  const ids = new Set<string>();
  const mappings = new Set<string>();
  fields.forEach((field, index) => {
    if (ids.has(field.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "id"], message: "Field IDs must be unique." });
    ids.add(field.id);
    if (field.mapping && mappings.has(field.mapping)) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, "mapping"], message: `Only one ${field.mapping.toLocaleLowerCase().replaceAll("_", " ")} field can be connected to the attendee record.` });
    if (field.mapping) mappings.add(field.mapping);
  });
});

export type RegistrationField = z.infer<typeof registrationFieldSchema>;
export type RegistrationAnswerValue = string | string[] | boolean;

const answerLabelPrefix = "__field_label__:";
const answerTypePrefix = "__field_type__:";

export function withRegistrationAnswerMetadata(fields: RegistrationField[], answers: Record<string, RegistrationAnswerValue>) {
  const stored = { ...answers };
  for (const field of fields) {
    stored[`${answerLabelPrefix}${field.id}`] = field.label;
    stored[`${answerTypePrefix}${field.id}`] = field.type;
  }
  return stored;
}

export function isRegistrationAnswerMetadataKey(fieldId: string) {
  return fieldId.startsWith(answerLabelPrefix) || fieldId.startsWith(answerTypePrefix);
}

export function storedRegistrationFieldLabel(answers: Record<string, RegistrationAnswerValue>, fieldId: string) {
  const label = answers[`${answerLabelPrefix}${fieldId}`];
  return typeof label === "string" ? label : undefined;
}

export const registrationFieldPresets: Array<{ name: string; description: string; field: Omit<RegistrationField, "id"> }> = [
  { name: "Guest", description: "Ask for a guest’s name and age status.", field: { label: "Will you bring a guest?", type: "GUEST", required: false, helpText: "If yes, we’ll ask for the guest’s first name, last name, and age status.", options: [], mapping: "GUEST" } },
  { name: "Email", description: "Use for pass delivery and reminders.", field: { label: "Email address", type: "TEXT", required: true, helpText: "We’ll use this for event updates and your digital pass.", options: [], mapping: "EMAIL" } },
  { name: "Phone", description: "Collect an optional contact number.", field: { label: "Phone number", type: "TEXT", required: false, helpText: "Optional", options: [], mapping: "PHONE" } },
  { name: "Work center", description: "Ask where the attendee works.", field: { label: "Work center", type: "SELECT", required: true, helpText: "Choose your primary work location.", options: ["Hanover Park", "Remote", "External"], mapping: "WORK_CENTER" } },
  { name: "Menu", description: "Offer one meal selection.", field: { label: "Menu selection", type: "SELECT", required: true, helpText: "Choose one meal option.", options: ["Standard", "Vegetarian", "Vegan"], mapping: "MENU" } },
  { name: "Dietary needs", description: "Allow several allergen selections.", field: { label: "Dietary or allergen needs", type: "MULTISELECT", required: false, helpText: "Choose every option that applies.", options: ["Dairy", "Gluten", "Nuts", "Shellfish"], mapping: "ALLERGENS" } },
  { name: "Accessibility", description: "Collect a private accommodation note.", field: { label: "Accessibility accommodations", type: "TEXTAREA", required: false, helpText: "Tell the event team what would help you participate comfortably.", options: [] } }
];

export function parseRegistrationFields(value: string | null | undefined): RegistrationField[] {
  if (!value) return [];
  try {
    const parsed = registrationFieldsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function validateRegistrationAnswers(fields: RegistrationField[], answers: unknown) {
  const source = typeof answers === "object" && answers && !Array.isArray(answers) ? answers as Record<string, unknown> : {};
  const clean: Record<string, RegistrationAnswerValue> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = source[field.id];
    if (field.type === "GUEST") {
      const guestStatus = value === "ADULT" || value === "UNDER_21" || value === "PENDING" ? value : "NONE";
      if (guestStatus === "PENDING") errors[field.id] = "Confirm whether the guest is 21 or older.";
      clean[field.id] = guestStatus;
      continue;
    }
    if (field.type === "CHECKBOX") {
      const checked = value === true;
      if (field.required && !checked) errors[field.id] = `${field.label} must be confirmed.`;
      clean[field.id] = checked;
      continue;
    }
    if (field.type === "MULTISELECT") {
      const selected = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && field.options.includes(item)).slice(0, field.options.length)
        : [];
      if (field.required && selected.length === 0) errors[field.id] = `${field.label} is required.`;
      clean[field.id] = selected;
      continue;
    }
    const text = typeof value === "string" ? value.trim().slice(0, field.type === "TEXTAREA" ? 2000 : 240) : "";
    if (field.required && !text) errors[field.id] = `${field.label} is required.`;
    if (field.type === "SELECT" && text && !field.options.includes(text)) errors[field.id] = `Choose a valid option for ${field.label}.`;
    if (field.mapping === "EMAIL" && text && !z.string().email().safeParse(text).success) errors[field.id] = "Enter a valid email address.";
    clean[field.id] = text;
  }

  return { answers: clean, errors, valid: Object.keys(errors).length === 0 };
}

export function mappedRegistrationAnswers(fields: RegistrationField[], answers: Record<string, RegistrationAnswerValue>) {
  const mapped = new Map(fields.filter((field) => field.mapping).map((field) => [field.mapping!, answers[field.id]]));
  const text = (mapping: typeof registrationFieldMappings[number]) => typeof mapped.get(mapping) === "string" ? mapped.get(mapping) as string : undefined;
  const list = (mapping: typeof registrationFieldMappings[number]) => Array.isArray(mapped.get(mapping)) ? mapped.get(mapping) as string[] : undefined;
  return {
    email: text("EMAIL"),
    phone: text("PHONE"),
    company: text("WORK_CENTER"),
    selectedMenu: text("MENU"),
    selectedAllergens: list("ALLERGENS"),
    guestStatus: text("GUEST")
  };
}
