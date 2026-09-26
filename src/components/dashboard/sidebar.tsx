import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { dashboardNav } from "@/components/dashboard/dashboard-nav";
import { getBranding } from "@/lib/branding";
import type { Branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export async function Sidebar({ active = "Dashboard", branding: providedBranding, permissions = [] }: { active?: string; branding?: Branding; permissions?: string[] }) {
  const branding = providedBranding ?? await getBranding();
  const allowedNavigation = dashboardNav.filter((item) => permissions.includes(item.permission));

  return (
    <aside className="liquid-rail fixed inset-y-0 left-0 z-50 hidden h-dvh w-64 flex-col overflow-hidden border-r border-white/10 px-3 py-5 lg:flex">
      <Link href="/dashboard" className="relative flex items-center gap-3 rounded-xl px-3 py-2">
        <BrandMark branding={branding} />
        <span className="min-w-0">
          <span className="block truncate text-base font-bold tracking-[-0.02em]">{branding.name}</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Event operations</span>
        </span>
      </Link>
      <nav className="relative mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-4" aria-label="Dashboard navigation">
        {allowedNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 text-sm font-medium text-white/58 transition hover:bg-white/[0.06] hover:text-white",
              active === item.label && "border-primary/25 bg-primary/[0.12] text-white"
            )}
          >
            {active === item.label ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" /> : null}
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg transition-colors", active === item.label ? "text-primary" : "text-white/55 group-hover:text-white") }><item.icon className="h-4 w-4" /></span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="relative mt-4 shrink-0 border-t border-white/10 px-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/55">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
