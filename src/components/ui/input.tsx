"use client";

import { InputHTMLAttributes } from "react";
import { Input as TamaguiInput, type InputProps } from "tamagui";
import { cn } from "@/lib/utils";
import "./tamagui-primitives.css";

export function Input({ className, type, onWheel, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TamaguiInput
      className={cn("ep-tamagui-input", className)}
      type={type}
      onWheel={onWheel ?? (type === "number" ? (event) => event.currentTarget.blur() : undefined)}
      {...(props as InputProps)}
    />
  );
}
