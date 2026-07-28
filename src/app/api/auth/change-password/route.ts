import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/services/rate-limit";

export async function POST(request: NextRequest) {
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const limited = rateLimit(`password-change:${currentUser.id}`, 8);
  if (!limited.ok) return NextResponse.json({ error: "Too many password attempts" }, { status: 429 });

  const parsed = changePasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid password request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
  if (!user?.passwordHash || !(await compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  if (await compare(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ error: "New password must be different" }, { status: 400 });
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  const updated = await prisma.$transaction(async (transaction) => {
    const nextUser = await transaction.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      }
    });
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: user.id,
        action: "auth.password_changed",
        targetType: "User",
        targetId: user.id
      })
    });
    return nextUser;
  });

  await setSessionCookie(updated);
  return NextResponse.json({ ok: true });
}
