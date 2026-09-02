import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleDisplayControl } from "@/components/dashboard/raffle-display-control";

export default function RaffleDisplaysPage() {
  return (
    <AppShell active="Raffles">
      <PageTitle eyebrow="Raffles" title="Display Management" />
      <RaffleDisplayControl />
    </AppShell>
  );
}
