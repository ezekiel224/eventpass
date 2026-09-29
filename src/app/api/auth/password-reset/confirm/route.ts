import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashOpaqueToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const parsed = z.object({ token: z.string().min(32), password: z.string().min(12).max(128) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reset request" }, { status: 400 });
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashOpaqueToken(parsed.data.token) } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await hash(parsed.data.password, 12), mustChangePassword: false, passwordChangedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);
  return NextResponse.json({ ok: true });
}
