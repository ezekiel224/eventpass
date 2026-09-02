import { AppShell } from "@/components/dashboard/app-shell";
import { AttendeesManager } from "@/components/dashboard/attendees-manager";
import { PageTitle } from "@/components/dashboard/page-title";

export default async function AttendeesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <AppShell active="Attendees">
      <PageTitle eyebrow="Management" title="Attendees" />
      <AttendeesManager initialQuery={q ?? ""} />
    </AppShell>
  );
}
