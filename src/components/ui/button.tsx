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
        "focus-ring group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-xl px-4 text-sm font-semibold transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
        variant === "primary" && "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-glow",
        variant === "secondary" && "border border-border/80 bg-card/72 text-foreground backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/80",
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
