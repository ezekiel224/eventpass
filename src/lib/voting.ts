import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { storedImageSchema } from "@/lib/image-schema";
import { normalizePersonName } from "@/lib/text";

export const votingOptionSchema = z.object({
  label: z.string().trim().min(1).max(160),
  imageUrl: storedImageSchema.optional().default("")
});

export const votingQuestionSchema = z.object({
  prompt: z.string().trim().min(2).max(300),
  description: z.string().trim().max(800).optional().default(""),
  imageUrl: storedImageSchema.optional().default(""),
  type: z.enum(["SINGLE", "MULTIPLE"]),
  required: z.boolean().default(true),
  options: z.array(votingOptionSchema).min(2).max(30)
});

export const votingFormSchema = z.object({
  questions: z.array(votingQuestionSchema).min(1).max(40)
});

export const votingBallotCreateSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1600).optional().default(""),
  coverImageUrl: storedImageSchema.optional().default(""),
  confirmationMessage: z.string().trim().max(800).optional().default("")
});

export const votingBallotUpdateSchema = votingBallotCreateSchema.omit({ eventId: true }).partial().extend({
  eventId: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional()
});

export const votingParticipantSchema = z.object({
  employeeNumber: z.string().trim().min(1, "Employee ID is required.").max(80),
  firstName: z.string().trim().min(1, "First name is required.").max(80).transform(normalizePersonName),
  lastName: z.string().trim().min(1, "Last name is required.").max(80).transform(normalizePersonName)
});

export const votingEmployeeIdSchema = votingParticipantSchema.pick({ employeeNumber: true });

export const votingSubmissionSchema = z.object({
  verificationToken: z.string().min(32).max(1000),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    optionIds: z.array(z.string().min(1)).max(30)
  })).max(40)
});

function votingSecret() {
  const secret = process.env.VOTING_ID_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Set VOTING_ID_SECRET or AUTH_SECRET before using voting.");
  return secret;
}

export function normalizeEmployeeNumber(value: string) {
  return value.normalize("NFKC").trim().toUpperCase();
}

export function hashEmployeeNumber(value: string) {
  return createHmac("sha256", votingSecret()).update(normalizeEmployeeNumber(value)).digest("hex");
}

export function createVotingSlug(title: string) {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "vote";
  return `${base}-${randomBytes(4).toString("hex")}`;
}

type VerificationPayload = { participantId: string; ballotId: string; expiresAt: number };

export function createVotingVerificationToken(participantId: string, ballotId: string) {
  const payload: VerificationPayload = { participantId, ballotId, expiresAt: Date.now() + 30 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", votingSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyVotingVerificationToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", votingSecret()).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as VerificationPayload;
    if (!payload.participantId || !payload.ballotId || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
}
