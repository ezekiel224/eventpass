import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-xl border border-border/80 bg-background/72 px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-none backdrop-blur transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/30 focus-visible:border-primary/60",
        className
      )}
      {...props}
    />
  );
}
