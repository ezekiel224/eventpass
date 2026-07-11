"use client";

import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      aria-label="Toggle theme"
      title="Toggle theme"
      variant="secondary"
      className="h-10 w-10 px-0"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Moon className="h-4 w-4" />
    </Button>
  );
}
