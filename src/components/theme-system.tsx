"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export const siteThemes = [
  { id: "harbor", name: "Harbor Blue", accent: "#5278c7", darkAccent: "#83a6ed" },
  { id: "copper", name: "Ink & Copper", accent: "#a95632", darkAccent: "#e19369" },
  { id: "aubergine", name: "Aubergine & Clay", accent: "#79526f", darkAccent: "#c18aac" },
  { id: "amber", name: "Carbon & Amber", accent: "#9a5d12", darkAccent: "#e5a84c" },
] as const;

export type SiteThemeId = (typeof siteThemes)[number]["id"];

type ThemeSystemValue = {
  palette: SiteThemeId;
  setPalette: (palette: SiteThemeId, origin?: { x: number; y: number }) => void;
};

const ThemeSystemContext = createContext<ThemeSystemValue | null>(null);
const storageKey = "eventpass-palette";
const changeEvent = "eventpass-palette-change";
const cookieMaxAge = 60 * 60 * 24 * 365;

type ThemeViewTransition = { finished: Promise<void>; skipTransition: () => void };
type ThemeTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ThemeViewTransition;
};

let activeThemeTransition: ThemeViewTransition | null = null;

export function runThemeTransition(update: () => void | Promise<void>, origin?: { x: number; y: number }) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transitionDocument = document as ThemeTransitionDocument;
  if (!origin || reducedMotion || !transitionDocument.startViewTransition) {
    void update();
    return;
  }

  document.documentElement.style.setProperty("--theme-reveal-x", `${origin.x}px`);
  document.documentElement.style.setProperty("--theme-reveal-y", `${origin.y}px`);
  activeThemeTransition?.skipTransition();
  const transition = transitionDocument.startViewTransition(update);
  activeThemeTransition = transition;
  void transition.finished.finally(() => {
    if (activeThemeTransition === transition) activeThemeTransition = null;
  });
}

export function persistAppearance(appearance: "light" | "dark") {
  window.localStorage.setItem("eventpass-theme", appearance);
  document.cookie = `eventpass-theme=${appearance}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
}

function isThemeId(value: string | null): value is SiteThemeId {
  return siteThemes.some((theme) => theme.id === value);
}

export function ThemeSystemProvider({ children }: { children: ReactNode }) {
  const palette = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(changeEvent, onStoreChange);
      return () => window.removeEventListener(changeEvent, onStoreChange);
    },
    (): SiteThemeId => isThemeId(document.documentElement.dataset.palette ?? null) ? document.documentElement.dataset.palette as SiteThemeId : "harbor",
    (): SiteThemeId => "harbor",
  );

  const setPalette = useCallback((nextPalette: SiteThemeId, origin?: { x: number; y: number }) => {
    if (nextPalette === palette) return;
    window.localStorage.setItem(storageKey, nextPalette);
    document.cookie = `${storageKey}=${nextPalette}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
    const applyPalette = () => {
      document.documentElement.dataset.palette = nextPalette;
      window.dispatchEvent(new Event(changeEvent));
    };
    runThemeTransition(applyPalette, origin);
  }, [palette]);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);
  return <ThemeSystemContext.Provider value={value}>{children}</ThemeSystemContext.Provider>;
}

export function useSiteTheme() {
  const value = useContext(ThemeSystemContext);
  if (!value) throw new Error("useSiteTheme must be used within ThemeSystemProvider");
  return value;
}
