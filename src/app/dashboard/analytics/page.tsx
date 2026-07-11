import { Download } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { CheckinChart, RegistrationsChart } from "@/components/dashboard/chart-card";
import { PageTitle } from "@/components/dashboard/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <AppShell active="Analytics">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageTitle eyebrow="Analytics" title="Track growth, attendance, and event performance." />
        <Button><Download className="h-4 w-4" /> Export Reports</Button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {[
          ["Attendance rate", "56%", "+12.1%"],
          ["Capacity utilization", "78%", "+8.3%"],
          ["Email success", "98.7%", "-0.4%"],
          ["Popular event", "Aurora", "936 registrations"]
        ].map(([label, value, detail]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <RegistrationsChart />
        <CheckinChart />
      </div>
    </AppShell>
  );
}
