import { AppShell } from "@/components/dashboard/app-shell";
import { CampaignsManager } from "@/components/dashboard/campaigns-manager";
import { CommunicationTemplatesManager } from "@/components/dashboard/communication-templates-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { requirePermission } from "@/lib/authorization";
import { getBranding } from "@/lib/branding";

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [authorization, { eventId }] = await Promise.all([requirePermission("settings:manage"), searchParams]);
  const branding = await getBranding(authorization.organization.id);
  return <AppShell active="Campaigns"><PageTitle title="Campaigns" /><CampaignsManager eventId={eventId ?? ""} timeZone={branding.timezone} automatedMessages={<CommunicationTemplatesManager eventId={eventId ?? ""} />} /></AppShell>;
}
