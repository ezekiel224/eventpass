import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/register", "/api/health"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPassCalendar = /^\/api\/attendees\/[^/]+\/calendar$/.test(pathname);
  const isPublicApi = isPublicPassCalendar || PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const requiresAuth = pathname.startsWith("/dashboard") || (pathname.startsWith("/api") && !isPublicApi);

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
};
