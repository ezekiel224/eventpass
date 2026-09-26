import { AppShell } from "@/components/dashboard/app-shell";
import { CheckInManager } from "@/components/dashboard/check-in-manager";
import { PageTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { MonitorUp, ScanLine } from "lucide-react";
import Link from "next/link";

export default function CheckInPage() {
  return (
    <AppShell active="Check In">
      <PageTitle eyebrow="Access" title="Event Check-In" />
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link href="/dashboard/check-in/display"><Button type="button" variant="secondary"><MonitorUp className="h-4 w-4" /> Open Live Display</Button></Link>
        <Link href="/dashboard/check-in/scanner"><Button type="button"><ScanLine className="h-4 w-4" /> Open Pass Scanner</Button></Link>
      </div>
      <CheckInManager />
    </AppShell>
  );
}
