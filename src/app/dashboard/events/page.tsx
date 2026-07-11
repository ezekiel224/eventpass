import { AppShell } from "@/components/dashboard/app-shell";
import { EventsManager } from "@/components/dashboard/events-manager";
import { PageTitle } from "@/components/dashboard/page-title";

export default function EventsPage() {
  return (
    <AppShell active="Events">
      <PageTitle eyebrow="Event management" title="Create, publish, duplicate, and archive events." />
      <EventsManager />
    </AppShell>
  );
}
