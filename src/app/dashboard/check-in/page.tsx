import { AppShell } from "@/components/dashboard/app-shell";
import { CheckInManager } from "@/components/dashboard/check-in-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { MonitorUp, ScanLine } from "lucide-react";
import { getBranding } from "@/lib/branding";
import { DashboardActions, DashboardLinkButton } from "@/components/dashboard/dashboard-surface";

export default async function CheckInPage() {
  const branding = await getBranding();
  return (
    <AppShell active="Check In">
      <PageTitle title="Check-In" />
      <DashboardActions>
        <DashboardLinkButton href="/dashboard/check-in/display" tone="secondary"><MonitorUp size={15} /> Open live display</DashboardLinkButton>
        <DashboardLinkButton href="/dashboard/check-in/scanner"><ScanLine size={15} /> Open pass scanner</DashboardLinkButton>
      </DashboardActions>
      <CheckInManager timeZone={branding.timezone} />
    </AppShell>
  );
}
