import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleDisplayControl } from "@/components/dashboard/raffle-display-control";
import { getBranding } from "@/lib/branding";

export default async function RaffleDisplaysPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const branding = await getBranding();
  return (
    <AppShell active="Raffles">
      <PageTitle title="Displays" />
      <RaffleDisplayControl timeZone={branding.timezone} eventId={eventId ?? ""} />
    </AppShell>
  );
}
