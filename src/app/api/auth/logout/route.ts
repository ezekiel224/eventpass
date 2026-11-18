import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { auditLogData } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getAuthorizationForUser } from "@/lib/authorization";
import { CLIENT_COOKIE } from "@/lib/client-context";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    const authorization = await getAuthorizationForUser(user.id, request.cookies.get(CLIENT_COOKIE)?.value);
    await prisma.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: user.id,
        actor: { id: user.id, email: user.email, name: user.name },
        organizationId: authorization?.organization.id,
        action: "auth.logout",
        targetType: "Session",
        targetId: user.id
      })
    });
  }
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
