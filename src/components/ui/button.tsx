"use client";

import { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { Button as TamaguiButton, type ButtonProps } from "@/components/tamagui/Button";
import { cn } from "@/lib/utils";
import "./tamagui-primitives.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  children,
  loading = false,
  loadingLabel = "Working…",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; loadingLabel?: string }) {
  return (
    <TamaguiButton
      className={cn("ep-tamagui-button", loading && "is-loading", className)}
      data-variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(props as ButtonProps)}
    >
      <span className="ep-button-content" aria-hidden={loading}>{children}</span>
      {loading ? <span className="ep-button-loading"><LoaderCircle aria-hidden="true" />{loadingLabel}</span> : null}
    </TamaguiButton>
  );
}
