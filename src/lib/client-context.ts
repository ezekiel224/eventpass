import { cookies } from "next/headers";

export const CLIENT_COOKIE = "praxis_client";
export const CLIENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function requestedClientId() {
  try {
    return (await cookies()).get(CLIENT_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export function clientCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_COOKIE_MAX_AGE
  };
}
