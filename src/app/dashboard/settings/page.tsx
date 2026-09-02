import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { SettingsManager } from "@/components/dashboard/settings-manager";

export default function SettingsPage() {
  return (
    <AppShell active="Settings">
      <PageTitle eyebrow="Administration" title="Settings" />
      <SettingsManager />
    </AppShell>
  );
}
