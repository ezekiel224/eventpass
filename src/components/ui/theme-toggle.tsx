"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color mode"}
      title={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle color mode"}
      variant="secondary"
      className="h-10 w-10 px-0"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="relative h-4 w-4" aria-hidden="true">
        <Sun className={`absolute inset-0 h-4 w-4 transition duration-300 ease-luxury ${mounted && !isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
        <Moon className={`absolute inset-0 h-4 w-4 transition duration-300 ease-luxury ${mounted && isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
      </span>
    </Button>
  );
}
