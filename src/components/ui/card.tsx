"use client";

import { HTMLAttributes } from "react";
import { YStack, type YStackProps } from "tamagui";
import { cn } from "@/lib/utils";
import "./tamagui-primitives.css";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <YStack
      className={cn("ep-tamagui-card", className)}
      position="relative"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="4"
      backgroundColor="background"
      overflow="hidden"
      {...(props as YStackProps)}
    />
  );
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <YStack
      className={cn("ep-tamagui-card", className)}
      position="relative"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="4"
      backgroundColor="background"
      overflow="hidden"
      {...(props as YStackProps)}
    />
  );
}
