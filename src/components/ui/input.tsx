import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-border/80 bg-background/72 px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.025)] backdrop-blur transition duration-300 ease-luxury hover:border-primary/35 focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
        className
      )}
      {...props}
    />
  );
}
