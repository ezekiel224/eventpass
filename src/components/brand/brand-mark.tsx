import { CheckSquare } from "lucide-react";
import { Branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function BrandMark({ branding, size = "md" }: { branding: Branding; size?: "sm" | "md" | "lg" }) {
  const boxSize = size === "sm" ? "h-9 w-9 rounded-xl" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-5 w-5";

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-primary/30 bg-primary text-primary-foreground shadow-glow", boxSize)}
      style={branding.logoUrl ? { backgroundImage: `url(${branding.logoUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
    >
      {branding.logoUrl ? <span className="sr-only">{branding.name}</span> : <CheckSquare className={iconSize} />}
    </span>
  );
}
