import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashOpaqueToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Verification token required" }, { status: 400 });
  const verification = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) return NextResponse.json({ error: "Verification link is invalid or expired" }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } })
  ]);
  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
