import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleTicketStation } from "@/components/dashboard/raffle-ticket-station";

export default async function RaffleTicketStationPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  return (
    <AppShell active="Raffles">
      <PageTitle title="Ticket Station" />
      <RaffleTicketStation eventId={eventId ?? ""} />
    </AppShell>
  );
}
