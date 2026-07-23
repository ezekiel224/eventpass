"use client";

import { MapPin } from "lucide-react";

type LocationMapVariant = "gala" | "casino" | "light" | "dark";

const variantStyles: Record<LocationMapVariant, { border: string; ink: string; filter: string; wash: string }> = {
  gala: {
    border: "rgba(229,196,118,.34)",
    ink: "#fff4d2",
    filter: "grayscale(.55) sepia(.38) saturate(.75) brightness(.72) contrast(1.08)",
    wash: "linear-gradient(90deg,rgba(20,25,28,.96),rgba(20,25,28,.5) 70%,rgba(229,196,118,.12))"
  },
  casino: {
    border: "rgba(210,168,77,.42)",
    ink: "#fff2cc",
    filter: "grayscale(.85) sepia(.62) saturate(.85) brightness(.58) contrast(1.18)",
    wash: "linear-gradient(90deg,rgba(5,5,4,.98),rgba(5,5,4,.58) 72%,rgba(210,168,77,.12))"
  },
  light: {
    border: "rgba(169,31,89,.25)",
    ink: "#38131f",
    filter: "grayscale(.15) saturate(.72) brightness(1.04) contrast(.92)",
    wash: "linear-gradient(90deg,rgba(255,248,233,.97),rgba(255,248,233,.66) 72%,rgba(204,238,232,.18))"
  },
  dark: {
    border: "rgba(255,255,255,.16)",
    ink: "#f8fafc",
    filter: "grayscale(.65) saturate(.7) brightness(.62) contrast(1.1)",
    wash: "linear-gradient(90deg,rgba(5,8,10,.96),rgba(5,8,10,.56) 72%,transparent)"
  }
};

export function PassLocationMap({
  address,
  venue,
  variant,
  accent
}: {
  address?: string;
  venue?: string;
  variant: LocationMapVariant;
  accent: string;
}) {
  if (!address) return null;

  const styles = variantStyles[variant];
  const query = encodeURIComponent([venue, address].filter(Boolean).join(", "));

  return (
    <div
      className="relative h-[4.65rem] shrink-0 overflow-hidden rounded-xl border shadow-[inset_0_1px_rgba(255,255,255,0.08)] sm:h-[5.25rem]"
      style={{ borderColor: styles.border }}
    >
      <iframe
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.03]"
        src={`https://www.google.com/maps?q=${query}&z=15&output=embed`}
        title={`Map of ${venue ?? address}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
        style={{ border: 0, filter: styles.filter }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: styles.wash }} />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex max-w-[82%] items-center gap-2.5 px-3" style={{ color: styles.ink }}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}20`, color: accent }}>
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          {venue ? <span className="block truncate text-[7px] font-black uppercase tracking-[0.2em] opacity-55">{venue}</span> : null}
          <span className="mt-0.5 block line-clamp-2 text-[9px] font-semibold leading-3">{address}</span>
        </span>
      </div>
    </div>
  );
}
