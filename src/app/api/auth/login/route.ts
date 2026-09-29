import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/services/rate-limit";

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1)
}).strict();

export async function POST(request: NextRequest) {
  const limited = rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier }
      ]
    },
    include: { memberships: { where: { active: true }, orderBy: { joinedAt: "asc" }, take: 1 } }
  });

  if (!user?.passwordHash || !user.active || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email address before signing in" }, { status: 403 });
  }

  const membership = user.memberships[0];
  if (!membership) return NextResponse.json({ error: "No active organization membership" }, { status: 403 });
  await setSessionCookie(user, membership.organizationId);
  return NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
}
