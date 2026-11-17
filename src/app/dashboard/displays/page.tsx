import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleDisplayControl } from "@/components/dashboard/raffle-display-control";
import { getBranding } from "@/lib/branding";

export default async function DisplaysPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, branding] = await Promise.all([searchParams, getBranding()]);
  return (
    <AppShell active="Displays">
      <PageTitle eyebrow="Monitor every connected venue screen and configure its live content." title="Display Control" />
      <RaffleDisplayControl eventId={eventId ?? ""} timeZone={branding.timezone} />
    </AppShell>
  );
}
