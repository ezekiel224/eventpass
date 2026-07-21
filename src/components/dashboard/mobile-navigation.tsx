"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { dashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function MobileNavigation({ branding, active }: { branding: Branding; active: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <>
      <button
        className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card transition hover:border-primary/40 lg:hidden"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-dashboard-navigation"
        onClick={() => setOpen(true)}
      >
        <span className="flex w-5 flex-col gap-1.5" aria-hidden="true"><span className="h-0.5 rounded bg-current" /><span className="h-0.5 rounded bg-current" /><span className="h-0.5 rounded bg-current" /></span>
      </button>
      {open ? <button className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside
        id="mobile-dashboard-navigation"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,21rem)] flex-col border-r border-border bg-card p-4 shadow-soft transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "pointer-events-none -translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3 font-semibold">
            <BrandMark branding={branding} />
            <span className="truncate">{branding.name}</span>
          </Link>
          <button className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-muted" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-7 flex-1 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
          {dashboardNav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-muted-foreground", active === item.label && "border-primary/30 bg-primary/10 text-primary")}>
              <item.icon className="h-5 w-5" />{item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background p-3">
          <span className="text-sm text-muted-foreground">Theme</span><ThemeToggle />
        </div>
      </aside>
    </>
  );
}
