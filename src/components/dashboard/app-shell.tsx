import { Bell, LogOut, Search } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNavigation } from "@/components/dashboard/mobile-navigation";
import { Input } from "@/components/ui/input";
import { getBranding } from "@/lib/branding";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const branding = await getBranding();

  return (
    <div className="surface-grid min-h-screen">
      <Sidebar active={active} branding={branding} />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-2xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <MobileNavigation branding={branding} active={active} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:hidden">{active}</span>
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search events, attendees, emails..." />
            </div>
            <button className="focus-ring hidden h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card/72 text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:flex" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <form action="/api/auth/logout" method="post">
              <button className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card/72 text-muted-foreground transition hover:border-primary/40 hover:text-foreground" aria-label="Sign out" type="submit">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            <div className="hidden h-10 items-center gap-3 rounded-xl border border-border/80 bg-card/72 px-3 backdrop-blur sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
              <span className="text-sm font-medium">{branding.name}</span>
            </div>
          </div>
        </header>
        <main className="animate-fade-up px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
