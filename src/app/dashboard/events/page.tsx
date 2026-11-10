import { AppShell } from "@/components/dashboard/app-shell";
import { TamaguiEventsManager } from "@/components/dashboard/tamagui-events-manager";

export default function EventsPage() {
  return (
    <AppShell active="Events">
      <TamaguiEventsManager />
    </AppShell>
  );
}
