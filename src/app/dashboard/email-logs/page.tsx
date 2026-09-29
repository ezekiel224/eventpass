import { MailCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function EmailLogsPage() {
  const authorization = await requirePermission("settings:manage");
  const emailLogs = await prisma.emailLog.findMany({
    where: { event: { organizationId: authorization.organization.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { event: true }
  });

  return (
    <AppShell active="Dashboard">
      <PageTitle eyebrow="Historical delivery records, including archived events" title="Communications" />
      <Card className="mt-6 overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-2 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-lg font-semibold">Recent email logs</h2>
            <p className="mt-1 text-xs text-muted-foreground">The 50 most recent delivery attempts across all events.</p>
          </div>
          <p className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{process.env.EMAIL_PROVIDER ?? "console"} provider</p>
        </div>
        <div className="space-y-2 p-4 sm:p-5">
          {emailLogs.length === 0 ? <p className="text-sm text-muted-foreground">No email attempts yet.</p> : null}
          {emailLogs.map((log) => (
            <div key={log.id} className="choice-tile flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MailCheck className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-medium">{log.type}</p>
                  <p className="truncate text-sm text-muted-foreground">{log.recipient} · {log.event.name}</p>
                  {log.event.status === "ARCHIVED" ? <p className="mt-1 text-xs font-medium text-muted-foreground">Archived event</p> : null}
                  {log.error ? <p className="mt-1 text-xs text-destructive">{log.error}</p> : null}
                </div>
              </div>
              <div className="shrink-0 text-sm sm:text-right">
                <span className={log.status === "FAILED" ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive" : "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"}>{log.status}</span>
                <p className="mt-2 text-muted-foreground">{log.createdAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
