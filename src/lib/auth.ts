import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, revokeSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "@/lib/session";

export async function setSessionCookie(user: { id: string }, organizationId: string) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const token = await createSessionToken({ userId: user.id, organizationId, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: requestHeaders.get("user-agent") });
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  await revokeSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, username: session.user.username, name: session.user.name, active: session.user.active, mustChangePassword: session.user.mustChangePassword, organizationId: session.organizationId, sessionId: session.id };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.active) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}
