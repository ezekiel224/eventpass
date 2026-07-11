import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(8).max(2000),
  venue: z.string().min(2).max(160),
  address: z.string().min(4).max(240),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.coerce.number().int().positive(),
  photoUrl: z.string().url().or(z.literal("")).optional(),
  allergenOptions: z.array(z.string().min(1).max(80)).optional(),
  organizer: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  registrationEnabled: z.boolean().default(true),
  qrPassesEnabled: z.boolean().default(true),
  emailConfirmationsEnabled: z.boolean().default(true),
  waitlistEnabled: z.boolean().default(false),
  registrationDeadline: z.coerce.date().optional()
});

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
