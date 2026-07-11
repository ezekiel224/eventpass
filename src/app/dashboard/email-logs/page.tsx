import { MailCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmailLogsPage() {
  const emailLogs = await prisma.emailLog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    include: {
      event: true
    }
  });

  return (
    <AppShell active="Email Logs">
      <PageTitle eyebrow="Email delivery" title="Confirmation, pass, reminder, and update messages." />
      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent email logs</h2>
          <p className="text-sm text-muted-foreground">{process.env.EMAIL_PROVIDER ?? "console"} provider</p>
        </div>
        <div className="mt-5 space-y-3">
          {emailLogs.length === 0 ? <p className="text-sm text-muted-foreground">No email attempts yet.</p> : null}
          {emailLogs.map((log) => (
            <div key={log.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MailCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{log.type}</p>
                  <p className="text-sm text-muted-foreground">{log.recipient} - {log.event.name}</p>
                  {log.error ? <p className="mt-1 text-xs text-destructive">{log.error}</p> : null}
                </div>
              </div>
              <div className="text-sm sm:text-right">
                <span className={log.status === "FAILED" ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive" : "rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"}>{log.status}</span>
                <p className="mt-2 text-muted-foreground">{log.createdAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
