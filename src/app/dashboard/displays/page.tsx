import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleDisplayControl } from "@/components/dashboard/raffle-display-control";

export default function DisplaysPage() {
  return (
    <AppShell active="Displays">
      <PageTitle eyebrow="Monitor every connected venue screen and configure its live content." title="Display Control" />
      <RaffleDisplayControl />
    </AppShell>
  );
}
