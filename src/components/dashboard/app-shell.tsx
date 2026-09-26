import { Command, LogOut, UserRound } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNavigation } from "@/components/dashboard/mobile-navigation";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizationForUser } from "@/lib/authorization";
import { getBranding } from "@/lib/branding";
import { PageTransition } from "@/components/layout/page-transition";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const [branding, currentUser] = await Promise.all([getBranding(), getCurrentUser()]);
  const authorization = currentUser ? await getAuthorizationForUser(currentUser.id) : null;
  const permissions = [...(authorization?.permissions ?? [])];

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <Sidebar active={active} branding={branding} permissions={permissions} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95">
          <div className="mx-auto flex h-16 max-w-[112rem] items-center gap-3 px-4 sm:px-6 lg:px-7">
            <MobileNavigation branding={branding} active={active} permissions={permissions} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Command className="h-3.5 w-3.5 text-primary" />
                <p className="truncate text-sm font-semibold tracking-[-0.01em]">{active}</p>
              </div>
            </div>
            <DashboardSearch />
            <div className="liquid-account flex h-10 items-center overflow-hidden rounded-xl">
              <div className="hidden min-w-0 items-center gap-2.5 border-r border-border/70 px-3.5 sm:flex">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UserRound className="h-3.5 w-3.5" /></span>
                <span className="max-w-40 truncate text-sm font-medium">{currentUser?.name || currentUser?.username || currentUser?.email || "Account"}</span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button className="focus-ring flex h-11 w-11 items-center justify-center text-muted-foreground hover:bg-muted/70 hover:text-foreground" aria-label="Sign out" title="Sign out" type="submit">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>
        <PageTransition className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">{children}</PageTransition>
      </div>
    </div>
  );
}
