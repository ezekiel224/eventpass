import { AppShell } from "@/components/dashboard/app-shell";
import { CheckInManager } from "@/components/dashboard/check-in-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { MonitorUp } from "lucide-react";
import Link from "next/link";

export default function CheckInPage() {
  return (
    <AppShell active="Check In">
      <PageTitle eyebrow="QR scanner" title="Validate passes and prevent duplicate check-ins." />
      <div className="mt-4 flex justify-end">
        <Link href="/dashboard/check-in/display"><Button type="button" variant="secondary"><MonitorUp className="h-4 w-4" /> Open Live Display</Button></Link>
      </div>
      <CheckInManager />
    </AppShell>
  );
}
