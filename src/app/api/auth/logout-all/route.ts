import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { revokeAllUserSessions } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  await revokeAllUserSessions(user.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
