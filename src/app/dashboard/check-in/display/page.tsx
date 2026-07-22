import { CheckInDisplay } from "@/components/dashboard/check-in-display";

export default async function CheckInDisplayPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  return <CheckInDisplay initialEventId={eventId ?? ""} />;
}
