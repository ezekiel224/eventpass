"use client";

import type { ReactNode } from "react";
import { SizableText, XStack, YStack } from "tamagui";
import { Separator } from "@/components/tamagui/Separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function SimpleLoginScreen({ children, productName }: { children: ReactNode; productName: string }) {
  return (
    <YStack minHeight="100dvh" position="relative" paddingHorizontal="4" paddingVertical="6">
      <XStack className="right-4 top-4 sm:right-6 sm:top-6" position="absolute">
        <ThemeToggle />
      </XStack>

      <YStack width="100%" maxWidth={380} margin="auto" gap="6">
        <YStack gap="2">
          <SizableText fontFamily="body" fontSize="xl" fontWeight="700" letterSpacing={-0.5}>
            {productName}
          </SizableText>
          <Separator borderColor="border-color" />
        </YStack>

        <YStack gap="2">
          <SizableText asChild fontFamily="body" fontSize="3xl" lineHeight="4xl" fontWeight="700" letterSpacing={-1}>
            <h1>Sign in</h1>
          </SizableText>
          <SizableText fontFamily="body" fontSize="sm" lineHeight="lg" color="color-8">
            Enter your account details to continue.
          </SizableText>
        </YStack>

        {children}
      </YStack>
    </YStack>
  );
}
