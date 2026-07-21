"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  ["#features", "Features"],
  ["#screens", "Screenshots"],
  ["#pricing", "Pricing"],
  ["#faq", "FAQ"]
] as const;

export function MarketingMobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="md:hidden">
      <button className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="marketing-mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <div id="marketing-mobile-menu" className="absolute left-0 right-0 top-full border-b border-border bg-background p-4 shadow-soft">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Mobile navigation">
            {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-sm font-medium hover:bg-muted">{label}</a>)}
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2 sm:hidden"><Button variant="secondary" className="w-full">Sign in</Button></Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-2 sm:hidden"><Button className="w-full">Open app</Button></Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
