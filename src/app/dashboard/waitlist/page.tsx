import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { WaitlistManager } from "@/components/dashboard/waitlist-manager";
import { requirePermission } from "@/lib/authorization";

export default async function WaitlistPage() {
  await requirePermission("attendees:manage");
  return <AppShell active="Waitlist"><PageTitle title="Waitlist" /><WaitlistManager /></AppShell>;
}
