import { BarChart3, CalendarDays, Gift, LayoutDashboard, Mail, QrCode, Settings, Users } from "lucide-react";

export const dashboardNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users },
  { href: "/dashboard/check-in", label: "Check In", icon: QrCode },
  { href: "/dashboard/raffles", label: "Raffles", icon: Gift },
  { href: "/dashboard/email-logs", label: "Email Logs", icon: Mail },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
] as const;
