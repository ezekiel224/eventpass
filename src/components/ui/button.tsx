import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "focus-ring group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl px-4 text-sm font-semibold tracking-[-0.01em] transition duration-300 ease-luxury active:scale-[0.98]",
        variant === "primary" && "bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/.16)] hover:-translate-y-0.5 hover:bg-primary/90",
        variant === "secondary" && "border border-border bg-card text-foreground shadow-[0_6px_18px_rgb(36_28_22/.06)] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted/70",
        variant === "ghost" && "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        variant === "danger" && "bg-destructive text-white hover:-translate-y-0.5 hover:shadow-soft",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition group-active:opacity-100">
        <span className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-white/60 animate-ripple" />
      </span>
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
