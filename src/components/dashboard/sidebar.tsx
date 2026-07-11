import Link from "next/link";
import { BarChart3, CalendarDays, Gift, LayoutDashboard, Mail, QrCode, Settings, Users } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getBranding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users },
  { href: "/dashboard/check-in", label: "Check In", icon: QrCode },
  { href: "/dashboard/raffles", label: "Raffles", icon: Gift },
  { href: "/dashboard/email-logs", label: "Email Logs", icon: Mail },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export async function Sidebar({ active = "Dashboard" }: { active?: string }) {
  const branding = await getBranding();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border/70 bg-card/62 px-4 py-5 shadow-soft backdrop-blur-2xl lg:block">
      <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-1 text-lg font-semibold">
        <BrandMark branding={branding} />
        {branding.name}
      </Link>
      <nav className="mt-8 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border/80 hover:bg-muted/60 hover:text-foreground",
              active === item.label && "border-primary/30 bg-primary/10 text-primary shadow-glow"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-border/80 bg-background/66 p-4 backdrop-blur-xl">
        <p className="text-sm font-semibold">{branding.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Admin workspace</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
