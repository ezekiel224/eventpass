import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, onWheel, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-border/90 bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition duration-300 ease-luxury hover:border-primary/45 focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]",
        className
      )}
      type={type}
      onWheel={onWheel ?? (type === "number" ? (event) => event.currentTarget.blur() : undefined)}
      {...props}
    />
  );
}
