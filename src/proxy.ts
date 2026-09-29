import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationForUser } from "@/lib/authorization";
import { hasTrustedRequestOrigin } from "@/lib/csrf";
import { permissionForRequest } from "@/lib/permissions";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { prisma } from "@/lib/db";

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/setup", "/api/auth/password-reset", "/api/auth/email-verification", "/api/register", "/api/health", "/api/auth/csrf"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") && !SAFE_METHODS.has(request.method) && !hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });
  }

  const isPublicPassCalendar = /^\/api\/attendees\/[^/]+\/calendar$/.test(pathname);
  const isPublicPassQr = /^\/api\/pass\/[^/]+\/qr$/.test(pathname);
  const isPublicPassTickets = /^\/api\/pass\/[^/]+\/raffle-tickets$/.test(pathname);
  const isPublicPassDownload = /^\/api\/attendees\/[^/]+\/pass-download$/.test(pathname);
  const isPublicPrizeAcceptance = /^\/api\/prize-acceptance\/[^/]+$/.test(pathname);
  const isPublicRaffleDisplay = pathname === "/api/raffle-display/pair" || pathname === "/api/raffle-display/session";
  const isPublicVoting = pathname.startsWith("/api/public/voting/");
  const isPublicApi = isPublicPassCalendar || isPublicPassQr || isPublicPassTickets || isPublicPassDownload || isPublicPrizeAcceptance || isPublicRaffleDisplay || isPublicVoting || PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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

  const authorization = await getAuthorizationForUser(session.userId, session.organizationId);
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

  // Resource ownership is checked at the request boundary so nested handlers can
  // never receive an identifier owned by another organization.
  const eventMatch = pathname.match(/^\/api\/events\/([^/]+)/);
  if (eventMatch) {
    const event = await prisma.event.findFirst({ where: { id: eventMatch[1], organizationId: session.organizationId }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  const attendeeMatch = pathname.match(/^\/api\/attendees\/([^/]+)/);
  if (attendeeMatch) {
    const attendee = await prisma.attendee.findFirst({ where: { id: attendeeMatch[1], event: { organizationId: session.organizationId } }, select: { id: true } });
    if (!attendee) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  const ballotMatch = pathname.match(/^\/api\/voting\/([^/]+)/);
  if (ballotMatch) {
    const ballot = await prisma.votingBallot.findFirst({ where: { id: ballotMatch[1], event: { organizationId: session.organizationId } }, select: { id: true } });
    if (!ballot) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  const displayMatch = pathname.match(/^\/api\/raffle-displays\/([^/]+)/);
  if (displayMatch) {
    const display = await prisma.raffleDisplay.findFirst({ where: { id: displayMatch[1], event: { organizationId: session.organizationId } }, select: { id: true } });
    if (!display) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/change-password", "/api/:path*"]
};
