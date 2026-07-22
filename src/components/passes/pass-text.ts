import type { CSSProperties } from "react";

export function fittedEventTitleSize(value: string) {
  if (value.length > 58) return "clamp(1.55rem, 6.7vw, 2.55rem)";
  if (value.length > 36) return "clamp(1.85rem, 8vw, 3.1rem)";
  return "clamp(2.35rem, 10.5vw, 3.8rem)";
}

export function fittedGuestNameSize(value: string) {
  if (value.length > 34) return "clamp(1.05rem, 4.5vw, 1.5rem)";
  if (value.length > 24) return "clamp(1.2rem, 5vw, 1.75rem)";
  return "clamp(1.45rem, 6.2vw, 2.15rem)";
}

export function raisedLetteringStyle(accent: string, light = false): CSSProperties {
  return {
    transform: "translateZ(12px)",
    textShadow: light
      ? "0 -1px 0 rgba(255,255,255,.95), 0 1px 0 rgba(0,0,0,.16), 0 2px 3px rgba(0,0,0,.11)"
      : `0 -1px 0 color-mix(in srgb, ${accent} 42%, white), 0 1px 0 rgba(0,0,0,.78), 0 2px 1px rgba(0,0,0,.48), 0 6px 14px rgba(0,0,0,.2)`
  };
}
