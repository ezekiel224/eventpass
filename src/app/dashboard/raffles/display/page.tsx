import { RaffleDisplay } from "@/components/dashboard/raffle-display";
import { getBranding } from "@/lib/branding";

export default async function RaffleDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const branding = await getBranding();
  return <RaffleDisplay initialEventId={eventId ?? ""} timeZone={branding.timezone} />;
}
