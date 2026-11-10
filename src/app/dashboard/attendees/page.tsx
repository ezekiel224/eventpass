import { AppShell } from "@/components/dashboard/app-shell";
import { AttendeesManager } from "@/components/dashboard/attendees-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { getBranding } from "@/lib/branding";

export default async function AttendeesPage({ searchParams }: { searchParams: Promise<{ eventId?: string; q?: string }> }) {
  const { eventId, q } = await searchParams;
  const branding = await getBranding();
  return (
    <AppShell active="Attendees">
      <PageTitle title="Attendees" />
      <AttendeesManager eventId={eventId ?? ""} initialQuery={q ?? ""} timeZone={branding.timezone} />
    </AppShell>
  );
}
