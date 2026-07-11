import { RaffleDisplay } from "@/components/dashboard/raffle-display";

export default async function RaffleDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  return <RaffleDisplay initialEventId={eventId ?? ""} />;
}
