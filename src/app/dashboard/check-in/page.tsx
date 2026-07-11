import { AppShell } from "@/components/dashboard/app-shell";
import { CheckInManager } from "@/components/dashboard/check-in-manager";
import { PageTitle } from "@/components/dashboard/page-title";

export default function CheckInPage() {
  return (
    <AppShell active="Check In">
      <PageTitle eyebrow="QR scanner" title="Validate passes and prevent duplicate check-ins." />
      <CheckInManager />
    </AppShell>
  );
}
