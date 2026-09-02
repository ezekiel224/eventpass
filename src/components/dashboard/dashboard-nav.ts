import { CalendarDays, Gift, KeyRound, LayoutDashboard, Palette, QrCode, Settings, UserCog, Users, Vote } from "lucide-react";

export const dashboardNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, permission: "events:manage" },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users, permission: "attendees:manage" },
  { href: "/dashboard/pass-designs", label: "Pass Designs", icon: Palette, permission: "passes:manage" },
  { href: "/dashboard/check-in", label: "Check In", icon: QrCode, permission: "checkins:manage" },
  { href: "/dashboard/raffles", label: "Raffles", icon: Gift, permission: "raffles:manage" },
  { href: "/dashboard/voting", label: "Voting", icon: Vote, permission: "voting:manage" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
  { href: "/admin/settings/accounts", label: "Accounts", icon: UserCog, permission: "users:view" },
  { href: "/admin/settings/permissions", label: "Permissions", icon: KeyRound, permission: "roles:view" }
] as const;
