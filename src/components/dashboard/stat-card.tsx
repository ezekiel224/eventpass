import { LucideIcon } from "lucide-react";

export function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <div className="liquid-metric group">
      <div className="relative z-10 p-5 sm:p-6">
        <div className="relative flex items-start justify-between gap-4">
          <p className="panel-label pt-1">{label}</p>
          <span className="liquid-lens">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="relative mt-7 font-display text-4xl font-semibold tracking-[-0.055em] tabular-nums sm:text-[2.7rem]">{value}</p>
        <div className="relative mt-5 flex items-center gap-3 border-t border-border/55 pt-3">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
          <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
