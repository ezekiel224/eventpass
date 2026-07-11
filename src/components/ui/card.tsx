import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("motion-surface rounded-2xl border border-border/80 bg-card/78 shadow-soft backdrop-blur-xl", className)} {...props} />;
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass motion-surface rounded-2xl", className)} {...props} />;
}
