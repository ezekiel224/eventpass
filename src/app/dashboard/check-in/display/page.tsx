import { CheckInDisplay } from "@/components/dashboard/check-in-display";
import { getBranding } from "@/lib/branding";
import { requirePermission } from "@/lib/authorization";

export default async function CheckInDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, authorization] = await Promise.all([searchParams, requirePermission("checkins:manage")]);
  const branding = await getBranding(authorization.organization.id);
  return <CheckInDisplay initialEventId={eventId ?? ""} timeZone={branding.timezone} />;
}
