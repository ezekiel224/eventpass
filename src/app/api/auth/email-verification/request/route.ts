import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issueEmailVerificationToken } from "@/lib/account-tokens";
import { sendEmail } from "@/services/email";

export async function POST(request: NextRequest) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (user?.active && !user.emailVerified) {
      const token = await issueEmailVerificationToken(user.id);
      const url = `${(process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "")}/api/auth/email-verification/confirm?token=${encodeURIComponent(token)}`;
      await sendEmail({ to: user.email, subject: "Verify your EventPass email", html: `<p><a href="${url}">Verify email address</a></p><p>This link expires in 24 hours.</p>` }).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true });
}
