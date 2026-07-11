import { AppShell } from "@/components/dashboard/app-shell";
import { AttendeesManager } from "@/components/dashboard/attendees-manager";
import { PageTitle } from "@/components/dashboard/page-title";

export default function AttendeesPage() {
  return (
    <AppShell active="Attendees">
      <PageTitle eyebrow="Attendee management" title="Add, search, export, and manage registrations." />
      <AttendeesManager />
    </AppShell>
  );
}
