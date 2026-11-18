import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleDisplayControl } from "@/components/dashboard/raffle-display-control";
import { getBranding } from "@/lib/branding";
import { requirePermission } from "@/lib/authorization";

export default async function DisplaysPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, authorization] = await Promise.all([searchParams, requirePermission("raffles:manage")]);
  const branding = await getBranding(authorization.organization.id);
  return (
    <AppShell active="Displays">
      <PageTitle eyebrow="Monitor every connected venue screen and configure its live content." title="Display Control" />
      <RaffleDisplayControl eventId={eventId ?? ""} timeZone={branding.timezone} />
    </AppShell>
  );
}
