import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleWorkspace } from "@/components/dashboard/raffle-workspace";
import { MonitorCog, MonitorUp, ScanLine } from "lucide-react";
import { getBranding } from "@/lib/branding";
import { DashboardActions, DashboardLinkButton } from "@/components/dashboard/dashboard-surface";
import { requirePermission } from "@/lib/authorization";

export default async function RafflesPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, authorization] = await Promise.all([searchParams, requirePermission("raffles:manage")]);
  const branding = await getBranding(authorization.organization.id);
  return (
    <AppShell active="Raffles">
      <PageTitle title="Raffles" />
      <DashboardActions>
        <DashboardLinkButton href="/dashboard/raffles/displays"><MonitorCog size={15} /> Display control</DashboardLinkButton>
        <DashboardLinkButton href="/dashboard/raffles/display" tone="secondary"><MonitorUp size={15} /> Live preview</DashboardLinkButton>
        <DashboardLinkButton href="/dashboard/raffles/ticket-station"><ScanLine size={15} /> Ticket station</DashboardLinkButton>
      </DashboardActions>
      <RaffleWorkspace eventId={eventId ?? ""} timeZone={branding.timezone} />
    </AppShell>
  );
}
