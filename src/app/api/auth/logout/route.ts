import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { auditLogData } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    await prisma.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: user.id,
        actor: { id: user.id, email: user.email, name: user.name },
        action: "auth.logout",
        targetType: "Session",
        targetId: user.id
      })
    });
  }
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
