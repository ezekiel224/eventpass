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
        "focus-ring group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl px-4 text-sm font-semibold tracking-[-0.01em] transition duration-300 ease-luxury active:translate-y-0 active:scale-[0.98]",
        variant === "primary" && "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_12px_32px_hsl(var(--primary)/.20)] hover:-translate-y-0.5 hover:shadow-glow",
        variant === "secondary" && "border border-foreground/10 bg-[linear-gradient(145deg,hsl(var(--card)/0.72),hsl(var(--surface-raised)/0.48))] text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.09),0_8px_24px_rgb(2_6_23/0.07)] backdrop-blur-2xl hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/80 hover:shadow-soft",
        variant === "ghost" && "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        variant === "danger" && "bg-destructive text-white hover:-translate-y-0.5 hover:shadow-soft",
        className
      )}
      {...props}
    >
      {variant === "primary" ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:animate-sheen group-hover:opacity-100" /> : null}
      <span className="pointer-events-none absolute inset-0 opacity-0 transition group-active:opacity-100">
        <span className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-white/60 animate-ripple" />
      </span>
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
