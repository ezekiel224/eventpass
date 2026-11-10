"use client";

import type { ReactNode } from "react";
import { TamaguiProvider } from "tamagui";
import { config } from "../../tamagui.config";

export function AppTamaguiProvider({ children }: { children: ReactNode }) {
  return (
    <TamaguiProvider config={config} defaultTheme="light" disableInjectCSS>
      {children}
    </TamaguiProvider>
  );
}
