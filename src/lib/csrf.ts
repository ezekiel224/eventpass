import { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE = "eventpass_csrf";

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function createCsrfToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function csrfResponse() {
  const token = createCsrfToken();
  const response = NextResponse.json({ token });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60
  });
  return response;
}

export function validateCsrf(request: NextRequest) {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value ?? "";
  const headerToken = request.headers.get("x-csrf-token") ?? "";
  if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  return null;
}

export function hasTrustedRequestOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const requestHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
        ?? request.headers.get("host")
        ?? request.nextUrl.host;
      const requestProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
        ?? request.nextUrl.protocol.replace(":", "");
      const originUrl = new URL(origin);
      return originUrl.host === requestHost && originUrl.protocol === `${requestProtocol}:`;
    } catch {
      return false;
    }
  }
  return fetchSite === "same-origin" || fetchSite === "same-site";
}
