import { tokens as defaultThemeTokens } from "@tamagui/themes";

// Generated from tamagui-theme.json. Tamagui's palette builder names the
// generator's base/accent ramps surface/brand for semantic theme creation.
export const emeraldCyberPalettes = {
  surface: [
    "#f4f1e8", "#fbfaf5", "#d5d1c5", "#c3c2b8", "#afb2a9", "#98a098",
    "#7f8981", "#667169", "#34433b", "#202b26", "#121916",
  ],
  brand: [
    "#eff6f1", "#d8e8dd", "#b9d6c3", "#8fc3a6", "#58b884", "#287a50",
    "#236a46", "#1c5639", "#17452f", "#133725", "#102018",
  ],
  alert: [
    "#fff4f2", "#ffe2dc", "#ffc7bd", "#ffa38f", "#fa765d", "#dd4e36",
    "#b73724", "#8f2b1e", "#6c231a", "#4b1a15", "#2b0e0b",
  ],
} as const;

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function makePaletteTokens<const Palettes extends Record<string, readonly string[]>>(palettes: Palettes) {
  return Object.fromEntries(
    Object.entries(palettes).flatMap(([name, colors]) => colors.map((color, index) => [`${name}-${shades[index]}`, color])),
  ) as { [Name in keyof Palettes & string as `${Name}-${(typeof shades)[number]}`]: string };
}

export const emeraldCyberColorTokens = {
  ...defaultThemeTokens.color,
  ...makePaletteTokens(emeraldCyberPalettes),
};
