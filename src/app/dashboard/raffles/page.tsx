import { AppShell } from "@/components/dashboard/app-shell";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/dashboard/page-title";
import { RaffleWorkspace } from "@/components/dashboard/raffle-workspace";
import Link from "next/link";

export default function RafflesPage() {
  return (
    <AppShell active="Raffles">
      <PageTitle eyebrow="Raffle operations" title="Manage prizes, scan passes, and assign raffle tickets." />
      <div className="mt-4 flex justify-end">
        <Link href="/dashboard/raffles/display">
          <Button type="button" variant="secondary">Open Live Display</Button>
        </Link>
      </div>
      <RaffleWorkspace />
    </AppShell>
  );
}
