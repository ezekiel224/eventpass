import { RaffleDisplay } from "@/components/dashboard/raffle-display";
import { getBranding } from "@/lib/branding";
import { requirePermission } from "@/lib/authorization";

export default async function RaffleDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, authorization] = await Promise.all([searchParams, requirePermission("raffles:manage")]);
  const branding = await getBranding(authorization.organization.id);
  return <RaffleDisplay initialEventId={eventId ?? ""} timeZone={branding.timezone} />;
}
