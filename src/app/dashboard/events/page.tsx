import { AppShell } from "@/components/dashboard/app-shell";
import { EventsManager } from "@/components/dashboard/events-manager";
import { PageTitle } from "@/components/dashboard/page-title";

export default function EventsPage() {
  return (
    <AppShell active="Events">
      <PageTitle eyebrow="Management" title="Events" />
      <EventsManager />
    </AppShell>
  );
}
