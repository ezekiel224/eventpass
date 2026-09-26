"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { dashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import type { Branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function MobileNavigation({ branding, active, permissions = [] }: { branding: Branding; active: string; permissions?: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  // The portal target only exists after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
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

  function search(event: FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    setOpen(false);
    router.push(normalized ? `/dashboard/attendees?q=${encodeURIComponent(normalized)}` : "/dashboard/attendees");
  }

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
      {mounted ? createPortal(
        <AnimatePresence>
          {open ? (
            <>
              <motion.button
                className="fixed inset-0 z-[100] bg-black/72 lg:hidden"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.aside
                id="mobile-dashboard-navigation"
                className="liquid-rail fixed inset-y-0 left-0 z-[110] flex h-dvh w-[min(88vw,20rem)] flex-col overflow-hidden border-r border-white/10 p-5 shadow-2xl lg:hidden"
                initial={{ x: "-104%" }}
                animate={{ x: 0 }}
                exit={{ x: "-104%" }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative flex items-center justify-between gap-3">
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3">
                    <BrandMark branding={branding} />
                    <span className="min-w-0"><span className="block truncate font-bold">{branding.name}</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Event operations</span></span>
                  </Link>
                  <button className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 hover:bg-muted" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
                </div>
                {permissions.includes("attendees:manage") ? (
                  <form className="relative mt-7" role="search" onSubmit={search}>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search attendees" aria-label="Search attendees and passes" />
                  </form>
                ) : null}
                <nav className="mt-3 flex-1 space-y-1.5 overflow-y-auto" aria-label="Dashboard navigation">
                  {dashboardNav.filter((item) => permissions.includes(item.permission)).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-white/60 hover:bg-white/[0.06] hover:text-white", active === item.label && "border-primary/25 bg-primary/[0.12] text-white")}>
                      <span className={cn("grid h-8 w-8 place-items-center rounded-lg", active === item.label ? "text-primary" : "text-white/55")}><item.icon className="h-4 w-4" /></span>{item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 px-3 pt-4">
                  <span className="text-xs font-medium text-white/55">Appearance</span><ThemeToggle />
                </div>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>,
        document.body
      ) : null}
    </>
  );
}
