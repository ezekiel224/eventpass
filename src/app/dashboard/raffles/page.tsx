import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleWorkspace } from "@/components/dashboard/raffle-workspace";
import { MonitorCog, MonitorUp, ScanLine } from "lucide-react";
import { getBranding } from "@/lib/branding";
import { DashboardActions, DashboardLinkButton } from "@/components/dashboard/dashboard-surface";

export default async function RafflesPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const branding = await getBranding();
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
