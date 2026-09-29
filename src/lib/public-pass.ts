import { prisma } from "@/lib/db";
import { hashOpaqueToken } from "@/lib/session";
import { generateOpaqueToken } from "@/lib/session";

export function publicPassWhere(token: string) {
  return {
    accessTokenHash: hashOpaqueToken(token),
    accessTokenRevokedAt: null,
    accessTokenExpiresAt: { gt: new Date() }
  } as const;
}

export function findPublicPass(token: string) {
  return prisma.pass.findFirst({ where: publicPassWhere(token), include: { attendee: { include: { event: true } } } });
}

export async function rotatePublicPassToken(passId: string) {
  const token = generateOpaqueToken();
  await prisma.pass.update({ where: { id: passId }, data: { accessTokenHash: hashOpaqueToken(token), accessTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), accessTokenRevokedAt: null } });
  return token;
}
