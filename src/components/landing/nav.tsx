import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getBranding } from "@/lib/branding";
import { MarketingMobileMenu } from "@/components/landing/mobile-menu";

export async function MarketingNav() {
  const branding = await getBranding();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <BrandMark branding={branding} size="sm" />
          <span className="max-w-36 truncate sm:max-w-none">{branding.name}</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#screens" className="hover:text-foreground">Screenshots</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="secondary">Sign in</Button>
          </Link>
          <Link href="/dashboard" className="hidden sm:block">
            <Button>Open app</Button>
          </Link>
          <MarketingMobileMenu />
        </div>
      </div>
    </header>
  );
}
