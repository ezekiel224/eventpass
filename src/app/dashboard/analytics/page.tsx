import { redirect } from "next/navigation";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  redirect(`/dashboard${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""}`);
}
