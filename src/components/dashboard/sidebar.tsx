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
    <aside className="liquid-rail fixed inset-y-0 left-0 z-50 hidden h-dvh w-72 flex-col overflow-hidden border-r border-border/70 px-4 py-5 lg:flex">
      <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div aria-hidden="true" className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl" />
      <Link href="/dashboard" className="relative flex items-center gap-3 rounded-2xl px-2 py-1.5">
        <BrandMark branding={branding} />
        <span className="min-w-0">
          <span className="block truncate text-base font-bold tracking-[-0.02em]">{branding.name}</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Event orchestration</span>
        </span>
      </Link>
      <p className="relative mt-10 px-3 text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Operations</p>
      <nav className="relative mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-4">
        {allowedNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "nav-magnetic group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 text-sm font-medium text-muted-foreground hover:border-border/80 hover:bg-muted/55 hover:text-foreground",
              active === item.label && "border-primary/25 bg-primary/[0.09] text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05),0_10px_36px_hsl(var(--primary)/0.10)]"
            )}
          >
            {active === item.label ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))]" /> : null}
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg border border-transparent transition-colors", active === item.label ? "border-primary/20 bg-primary/[0.12] text-primary" : "bg-muted/45 group-hover:bg-muted") }><item.icon className="h-4 w-4" /></span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="chrome-panel relative mt-4 shrink-0 overflow-hidden rounded-2xl p-4">
        <div aria-hidden="true" className="absolute right-0 top-0 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <p className="relative text-sm font-semibold">System workspace</p>
        <p className="relative mt-1 text-xs leading-5 text-muted-foreground">Secure administrative environment</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
