export const RAFFLE_CONFETTI_PRESETS = ["BRAND", "GOLD", "CELEBRATION", "COOL", "CUSTOM"] as const;
export type RaffleConfettiPreset = (typeof RAFFLE_CONFETTI_PRESETS)[number];

export const RAFFLE_CONFETTI_PALETTES: Record<Exclude<RaffleConfettiPreset, "CUSTOM">, string[]> = {
  BRAND: ["#F4680A", "#F99D45", "#F0EBE5", "#191614"],
  GOLD: ["#FFD166", "#F4A261", "#FFF1B8", "#B7791F"],
  CELEBRATION: ["#FF4D6D", "#FFD166", "#06D6A0", "#118AB2", "#9B5DE5"],
  COOL: ["#38BDF8", "#2DD4BF", "#A78BFA", "#E0F2FE"]
};

export function isRaffleConfettiPreset(value: unknown): value is RaffleConfettiPreset {
  return typeof value === "string" && RAFFLE_CONFETTI_PRESETS.includes(value as RaffleConfettiPreset);
}
