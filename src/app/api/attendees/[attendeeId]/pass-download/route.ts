import { NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { createQrDataUrl } from "@/services/qr";

type Params = { params: Promise<{ attendeeId: string }> };

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event-pass";
}

export async function GET(_request: Request, { params }: Params) {
  const { attendeeId } = await params;
  const attendee = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: { event: true, pass: true }
  });
  if (!attendee?.pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const branding = await getBranding();
  const name = `${attendee.firstName} ${attendee.lastName}`;
  const qrDataUrl = await createQrDataUrl(JSON.parse(attendee.pass.qrPayload));
  const eventTime = `${formatTime(attendee.event.startsAt, branding.timezone)} - ${formatTime(attendee.event.endsAt, branding.timezone)}`;
  const primaryColor = /^#[0-9a-f]{6}$/i.test(branding.primaryColor) ? branding.primaryColor : "#315cf5";
  const accentColor = /^#[0-9a-f]{6}$/i.test(branding.accentColor) ? branding.accentColor : "#111827";
  const svg = `
    <svg width="760" height="980" viewBox="0 0 760 980" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="brand" x1="0" y1="0" x2="760" y2="980"><stop stop-color="${primaryColor}"/><stop offset="1" stop-color="${accentColor}"/></linearGradient></defs>
      <rect width="760" height="980" rx="42" fill="#f8fafc"/>
      <rect x="28" y="28" width="704" height="924" rx="36" fill="url(#brand)"/>
      <text x="58" y="94" fill="white" opacity=".72" font-size="17" font-weight="700" letter-spacing="4" font-family="Arial,sans-serif">${escapeXml(attendee.event.organizer.toUpperCase().slice(0, 54))}</text>
      <text x="58" y="158" fill="white" font-size="42" font-weight="800" font-family="Arial,sans-serif">${escapeXml(attendee.event.name.slice(0, 30))}</text>
      <rect x="58" y="226" width="644" height="164" rx="28" fill="white" opacity=".14"/>
      <text x="90" y="278" fill="white" opacity=".72" font-size="18" font-family="Arial,sans-serif">Attendee</text>
      <text x="90" y="332" fill="white" font-size="40" font-weight="800" font-family="Arial,sans-serif">${escapeXml(name.slice(0, 32))}</text>
      <text x="90" y="367" fill="white" opacity=".8" font-size="20" font-family="Arial,sans-serif">${escapeXml(attendee.ticketTier.slice(0, 44))}</text>
      <text x="58" y="466" fill="white" opacity=".86" font-size="20" font-family="Arial,sans-serif">${escapeXml(formatDate(attendee.event.startsAt, branding.timezone))}</text>
      <text x="58" y="502" fill="white" opacity=".86" font-size="20" font-family="Arial,sans-serif">${escapeXml(eventTime)}</text>
      <text x="58" y="538" fill="white" opacity=".86" font-size="20" font-family="Arial,sans-serif">${escapeXml(attendee.event.venue.slice(0, 46))}</text>
      <rect x="214" y="604" width="332" height="252" rx="28" fill="white"/>
      <image x="260" y="628" width="240" height="240" href="${qrDataUrl}"/>
      <text x="380" y="902" text-anchor="middle" fill="white" opacity=".78" font-size="18" font-family="Arial,sans-serif">Fallback: ${escapeXml(attendee.pass.fallbackCode)}</text>
    </svg>`;
  const filename = `${slugify(attendee.event.name)}-${slugify(name)}-pass.svg`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox"
    }
  });
}
