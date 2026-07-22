import { AppShell } from "@/components/dashboard/app-shell";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleWorkspace } from "@/components/dashboard/raffle-workspace";
import { MonitorUp, ScanLine } from "lucide-react";
import Link from "next/link";

export default function RafflesPage() {
  return (
    <AppShell active="Raffles">
      <PageTitle eyebrow="Raffle operations" title="Manage prizes, scan passes, and assign raffle tickets." />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link href="/dashboard/raffles/display">
          <Button type="button" variant="secondary"><MonitorUp className="h-4 w-4" /> Live Preview</Button>
        </Link>
        <Link href="/dashboard/raffles/ticket-station">
          <Button type="button"><ScanLine className="h-4 w-4" /> Raffle Ticket Station</Button>
        </Link>
      </div>
      <RaffleWorkspace />
    </AppShell>
  );
}
