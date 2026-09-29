import { prisma } from "@/lib/db";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/session";

export async function issuePasswordResetToken(userId: string) {
  const token = generateOpaqueToken();
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return token;
}

export async function issueEmailVerificationToken(userId: string) {
  const token = generateOpaqueToken();
  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.emailVerificationToken.create({ data: { userId, tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  return token;
}
