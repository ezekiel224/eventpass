import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { getAuthorizationForUser } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/services/rate-limit";
import { auditLogData } from "@/lib/audit";

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
    }
  });

  if (!user?.passwordHash || !user.active || !(await compare(parsed.data.password, user.passwordHash))) {
    const failedAuthorization = user ? await getAuthorizationForUser(user.id) : null;
    await prisma.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: user?.id ?? null,
        actor: user ? { id: user.id, email: user.email, name: user.name } : null,
        organizationId: failedAuthorization?.organization.id,
        action: "auth.login_failed",
        targetType: "Session",
        targetId: user?.id ?? null,
        metadata: { identifier, reason: !user ? "account_not_found" : !user.active ? "account_disabled" : "invalid_credentials" }
      })
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie(user);
  const authorization = await getAuthorizationForUser(user.id);
  await prisma.auditLog.create({
    data: auditLogData({
      request,
      actorUserId: user.id,
      actor: { id: user.id, email: user.email, name: user.name },
      organizationId: authorization?.organization.id,
      action: "auth.login_succeeded",
      targetType: "Session",
      targetId: user.id
    })
  });
  const home = authorization?.permissions.has("dashboard:view") ? "/dashboard" : authorization?.permissions.has("checkins:manage") ? "/scan" : "/forbidden";
  return NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword, home });
}
