import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issuePasswordResetToken } from "@/lib/account-tokens";
import { sendEmail } from "@/services/email";
import { rateLimit } from "@/services/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`password-reset:${request.headers.get("x-forwarded-for") ?? "local"}`, 5, 15 * 60_000);
  if (!limited.ok) return NextResponse.json({ ok: true });
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (user?.active) {
    const token = await issuePasswordResetToken(user.id);
    const url = `${(process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail({ to: user.email, subject: "Reset your EventPass password", html: `<p>A password reset was requested for your account.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour.</p>` }).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
