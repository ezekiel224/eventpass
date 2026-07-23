import { CalendarDays, Gift, LayoutDashboard, Palette, QrCode, Settings, Users } from "lucide-react";

export const dashboardNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users },
  { href: "/dashboard/pass-designs", label: "Pass Designs", icon: Palette },
  { href: "/dashboard/check-in", label: "Check In", icon: QrCode },
  { href: "/dashboard/raffles", label: "Raffles", icon: Gift },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
] as const;
