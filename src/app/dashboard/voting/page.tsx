import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { VotingManager } from "@/components/dashboard/voting-manager";

export default function VotingPage() {
  return (
    <AppShell active="Voting">
      <PageTitle eyebrow="Events" title="Employee Voting & Ballots" />
      <VotingManager />
    </AppShell>
  );
}
