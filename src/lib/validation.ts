import { z } from "zod";
import { passThemeIds } from "@/components/pass/pass-system";

export const eventFieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter an event name with at least 2 characters.").max(120, "Keep the event name under 120 characters."),
  description: z.string().trim().min(8, "Add a short description with at least 8 characters.").max(2000, "Keep the description under 2,000 characters."),
  venue: z.string().trim().min(2, "Enter the venue name.").max(160, "Keep the venue name under 160 characters."),
  address: z.string().trim().min(4, "Enter the venue address.").max(240, "Keep the address under 240 characters."),
  startsAt: z.coerce.date({ invalid_type_error: "Choose a valid event date and start time." }),
  endsAt: z.coerce.date({ invalid_type_error: "Choose a valid event date and end time." }),
  capacity: z.coerce.number().int("Capacity must be a whole number.").min(1, "Capacity must be at least 1.").max(1_000_000, "Capacity is too large."),
  photoUrl: z.string().trim().refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a complete http:// or https:// image URL.").optional(),
  allergenOptions: z.array(z.string().min(1).max(80)).optional(),
  organizer: z.string().trim().min(2, "Enter the organizer name.").max(120, "Keep the organizer name under 120 characters."),
  contactEmail: z.string().trim().email("Enter a valid contact email address."),
  contactPhone: z.string().trim().max(40, "Keep the phone number under 40 characters.").optional(),
  passTheme: z.enum(passThemeIds).default("minimal"),
  registrationEnabled: z.boolean().default(true),
  qrPassesEnabled: z.boolean().default(true),
  emailConfirmationsEnabled: z.boolean().default(true),
  waitlistEnabled: z.boolean().default(false),
  registrationDeadline: z.coerce.date({ invalid_type_error: "Choose a valid registration deadline." }).optional()
});

type EventTiming = {
  startsAt?: Date;
  endsAt?: Date;
  registrationDeadline?: Date;
};

function validateEventTiming(data: EventTiming, context: z.RefinementCtx) {
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End time must be after the start time." });
  }
  if (data.startsAt && data.registrationDeadline && data.registrationDeadline > data.startsAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["registrationDeadline"], message: "Registration must close before the event starts." });
  }
}

export const eventSchema = eventFieldsSchema.superRefine(validateEventTiming);

export const eventUpdateSchema = eventFieldsSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
}).superRefine(validateEventTiming);

export const attendeeRegistrationSchema = z.object({
  eventId: z.string().min(3),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  under21: z.boolean().optional(),
  selectedAllergens: z.array(z.string().min(1).max(80)).optional(),
  plusOneEnabled: z.boolean().optional(),
  plusOneFirstName: z.string().max(80).optional(),
  plusOneLastName: z.string().max(80).optional(),
  plusOneUnder21: z.boolean().optional(),
  plusOneAllergens: z.array(z.string().min(1).max(80)).optional(),
  ticketTier: z.string().max(80).optional(),
  seat: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
  vip: z.boolean().optional(),
  customAnswers: z.record(z.string()).optional()
});

export const publicAttendeeRegistrationSchema = attendeeRegistrationSchema.omit({
  notes: true,
  vip: true,
  ticketTier: true,
  seat: true,
  customAnswers: true
});

export const attendeeUpdateSchema = attendeeRegistrationSchema.omit({ eventId: true }).partial().extend({
  status: z.string().max(40).optional()
});

export const qrValidationSchema = z.object({
  attendeeId: z.string().min(3),
  eventId: z.string().min(3),
  token: z.string().min(16)
});

export const checkInSchema = z.object({
  attendeeId: z.string().optional(),
  fallbackCode: z.string().optional(),
  qrPayload: z.string().optional()
});
