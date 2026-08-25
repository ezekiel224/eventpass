import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        surface: "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))"
      },
      boxShadow: {
        soft: "0 24px 72px rgba(2, 6, 23, 0.13)",
        glow: "0 0 0 1px rgba(255,255,255,.08), 0 20px 64px rgba(49, 92, 245, .22)",
        chrome: "inset 0 1px 0 rgba(255,255,255,.07), 0 30px 90px rgba(2,6,23,.16)"
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.16, 1, 0.3, 1)",
        snap: "cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      backdropBlur: {
        "3xl": "32px"
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.35" },
          "100%": { transform: "scale(24)", opacity: "0" }
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        sheen: {
          "0%": { transform: "translateX(-140%) skewX(-18deg)" },
          "100%": { transform: "translateX(280%) skewX(-18deg)" }
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.04)" }
        }
      },
      animation: {
        ripple: "ripple .7s ease-out",
        "fade-up": "fade-up .55s cubic-bezier(0.16, 1, 0.3, 1) both",
        sheen: "sheen 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
        "soft-pulse": "soft-pulse 8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
