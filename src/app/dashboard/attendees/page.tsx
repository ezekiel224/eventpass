import { AppShell } from "@/components/dashboard/app-shell";
import { AttendeesManager } from "@/components/dashboard/attendees-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { getBranding } from "@/lib/branding";
import { requirePermission } from "@/lib/authorization";

export default async function AttendeesPage({ searchParams }: { searchParams: Promise<{ eventId?: string; q?: string }> }) {
  const [{ eventId, q }, authorization] = await Promise.all([searchParams, requirePermission("attendees:manage")]);
  const branding = await getBranding(authorization.organization.id);
  return (
    <AppShell active="Attendees">
      <PageTitle title="Attendees" />
      <AttendeesManager eventId={eventId ?? ""} initialQuery={q ?? ""} timeZone={branding.timezone} />
    </AppShell>
  );
}
