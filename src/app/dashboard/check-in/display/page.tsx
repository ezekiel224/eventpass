import { CheckInDisplay } from "@/components/dashboard/check-in-display";
import { getBranding } from "@/lib/branding";

export default async function CheckInDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const branding = await getBranding();
  return <CheckInDisplay initialEventId={eventId ?? ""} timeZone={branding.timezone} />;
}
