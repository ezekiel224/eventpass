import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleTicketStation } from "@/components/dashboard/raffle-ticket-station";

export default function RaffleTicketStationPage() {
  return (
    <AppShell active="Raffles">
      <PageTitle eyebrow="Admin-assisted entries" title="Raffle Ticket Station" />
      <RaffleTicketStation />
    </AppShell>
  );
}
