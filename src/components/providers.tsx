"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { AppTamaguiProvider } from "@/components/tamagui-provider";
import { ThemeSystemProvider } from "@/components/theme-system";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme storageKey="eventpass-theme">
      <ThemeSystemProvider>
        <AppTamaguiProvider>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </AppTamaguiProvider>
      </ThemeSystemProvider>
    </ThemeProvider>
  );
}
