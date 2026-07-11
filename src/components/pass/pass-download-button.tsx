"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type PassDownloadButtonProps = {
  attendeeName: string;
  eventName: string;
  organizer: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  fallbackCode: string;
  ticketTier: string;
  company: string | null;
  selectedAllergens: string[];
  plusOneName: string | null;
  under21Alert: boolean;
  qrDataUrl: string;
  primaryColor: string;
  accentColor: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event-pass";
}

export function PassDownloadButton({
  attendeeName,
  eventName,
  organizer,
  venue,
  eventDate,
  eventTime,
  fallbackCode,
  ticketTier,
  company,
  selectedAllergens,
  plusOneName,
  under21Alert,
  qrDataUrl,
  primaryColor,
  accentColor
}: PassDownloadButtonProps) {
  function downloadCard() {
    const details = [
      venue,
      eventDate,
      eventTime,
      `Fallback: ${fallbackCode}`,
      selectedAllergens.length > 0 ? `Allergens: ${selectedAllergens.join(", ")}` : "",
      plusOneName ? `Plus-one: ${plusOneName}` : ""
    ].filter(Boolean);
    const detailRows = details.map((detail, index) => (
      `<text x="58" y="${456 + index * 28}" fill="rgba(255,255,255,.82)" font-size="18" font-family="Inter, Arial">${escapeXml(detail)}</text>`
    )).join("");
    const under21Badge = under21Alert
      ? `<rect x="58" y="648" width="246" height="44" rx="16" fill="rgba(239,68,68,.18)"/><text x="78" y="677" fill="#fee2e2" font-size="18" font-weight="700" font-family="Inter, Arial">Under 21 check-in alert</text>`
      : "";

    const svg = `
      <svg width="760" height="980" viewBox="0 0 760 980" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="brand" x1="0" y1="0" x2="760" y2="980" gradientUnits="userSpaceOnUse">
            <stop stop-color="${escapeXml(primaryColor)}"/>
            <stop offset="1" stop-color="${escapeXml(accentColor)}"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="28" flood-opacity=".24"/>
          </filter>
        </defs>
        <rect width="760" height="980" rx="42" fill="#f8fafc"/>
        <rect x="28" y="28" width="704" height="924" rx="36" fill="url(#brand)" filter="url(#shadow)"/>
        <text x="58" y="94" fill="rgba(255,255,255,.72)" font-size="17" font-weight="700" letter-spacing="4" font-family="Inter, Arial">${escapeXml(organizer.toUpperCase())}</text>
        <text x="58" y="156" fill="white" font-size="46" font-weight="800" font-family="Inter, Arial">${escapeXml(eventName).slice(0, 34)}</text>
        <rect x="58" y="230" width="644" height="156" rx="28" fill="rgba(255,255,255,.14)"/>
        <text x="90" y="282" fill="rgba(255,255,255,.72)" font-size="18" font-family="Inter, Arial">Attendee</text>
        <text x="90" y="335" fill="white" font-size="42" font-weight="800" font-family="Inter, Arial">${escapeXml(attendeeName).slice(0, 32)}</text>
        <text x="90" y="366" fill="rgba(255,255,255,.78)" font-size="20" font-family="Inter, Arial">${escapeXml(`${ticketTier}${company ? ` - ${company}` : ""}`).slice(0, 48)}</text>
        ${detailRows}
        ${under21Badge}
        <rect x="478" y="442" width="184" height="184" rx="24" fill="white"/>
        <image x="496" y="460" width="148" height="148" href="${qrDataUrl}"/>
        <text x="478" y="660" fill="rgba(255,255,255,.74)" font-size="16" font-family="Inter, Arial">Scan for validation</text>
      </svg>
    `;

    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(eventName)}-${slugify(attendeeName)}-pass.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button className="flex-1" type="button" onClick={downloadCard}>
      <Download className="h-4 w-4" /> Download Card
    </Button>
  );
}
