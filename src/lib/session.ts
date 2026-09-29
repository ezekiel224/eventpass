import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "eventpass_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionToken({ userId, organizationId, ipAddress, userAgent }: { userId: string; organizationId: string; ipAddress?: string | null; userAgent?: string | null }) {
  const token = generateOpaqueToken();
  await prisma.session.create({ data: { tokenHash: hashOpaqueToken(token), userId, organizationId, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000) } });
  return token;
}

export async function verifySessionToken(token?: string) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashOpaqueToken(token) }, include: { user: true, organization: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
  return session;
}

export async function revokeSessionToken(token?: string) {
  if (!token) return;
  await prisma.session.updateMany({ where: { tokenHash: hashOpaqueToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) }, data: { revokedAt: new Date() } });
}
