import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationForUser } from "@/lib/authorization";
import { hasTrustedRequestOrigin } from "@/lib/csrf";
import { permissionForRequest } from "@/lib/permissions";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/register", "/api/health", "/api/auth/csrf"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") && !SAFE_METHODS.has(request.method) && !hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });
  }

  const isPublicPassCalendar = /^\/api\/attendees\/[^/]+\/calendar$/.test(pathname);
  const isPublicPassQr = /^\/api\/pass\/[^/]+\/qr$/.test(pathname);
  const isPublicPrizeAcceptance = /^\/api\/prize-acceptance\/[^/]+$/.test(pathname);
  const isPublicApi = isPublicPassCalendar || isPublicPassQr || isPublicPrizeAcceptance || PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const requiresAuth = pathname.startsWith("/dashboard")
    || pathname.startsWith("/admin")
    || pathname === "/change-password"
    || (pathname.startsWith("/api") && !isPublicApi);

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const authorization = await getAuthorizationForUser(session.userId);
  if (!authorization) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Account disabled or unavailable" }, { status: 403 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const passwordRoute = pathname === "/change-password"
    || pathname === "/api/auth/change-password"
    || pathname === "/api/auth/logout"
    || pathname === "/api/auth/csrf";
  if (authorization.user.mustChangePassword && !passwordRoute) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/change-password", request.url));
  }
  if (!authorization.user.mustChangePassword && pathname === "/change-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const requiredPermission = permissionForRequest(pathname, request.method);
  if (requiredPermission && !authorization.permissions.has(requiredPermission)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = "/forbidden";
    return NextResponse.rewrite(forbiddenUrl, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/change-password", "/api/:path*"]
};
