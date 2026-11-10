import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { VotingManager } from "@/components/dashboard/voting-manager";

export default async function VotingPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  return (
    <AppShell active="Voting">
      <PageTitle title="Voting" />
      <VotingManager eventId={eventId} />
    </AppShell>
  );
}
