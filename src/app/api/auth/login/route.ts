import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/services/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 10);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie(user);
  return NextResponse.json({ ok: true });
}
