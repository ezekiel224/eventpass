import "./_page.css"
import { MailCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { DashboardBadge, DashboardEmpty, DashboardPanel, DashboardPanelHeader, DashboardRow } from "@/components/dashboard/dashboard-surface";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function EmailLogsPage() {
  const [emailLogs, branding] = await Promise.all([prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { event: true }
  }), getBranding()]);

  return (
    <AppShell active="Campaigns">
      <PageTitle title="Delivery History" />
      <DashboardPanel>
        <DashboardPanelHeader
          title="Recent email logs"
          description="The 50 most recent delivery attempts across the organization."
          aside={<DashboardBadge>{process.env.EMAIL_PROVIDER ?? "console"} provider</DashboardBadge>}
        />
        {emailLogs.length === 0 ? <DashboardEmpty>No email attempts yet.</DashboardEmpty> : null}
        {emailLogs.map((log) => (
          <DashboardRow key={log.id}>
            <div className="is_View _f-1872995505 _mw-839999524 _ai-1055227096 _g-924523048"   >
              <div className="is_View _w-1646887001 _h-624256600 _f-1246371194 _ai-1055227096 _jc-166379546 _br-1889339809 _b-347950030 _c-674879385"       ><MailCheck size={15} /></div>
              <div className="is_View _f-549969169 _mw-839999524 _g-924522986"  >
                <span className="is_Text _c-479604596 _fs-553824545 _fw-291939625"  >{log.type}</span>
                <span className="is_Text _c-1589498260 _fs-553823584 _mw-263605216 _o-1433117770 _to-1924430550 _ws-768898162"  >{log.recipient} · {log.event.name}</span>
                {log.error ? <span className="is_Text _c-1220575877 _fs-553822623" >{log.error}</span> : null}
              </div>
            </div>
            <div className="is_View _f-473034193 _ai-1238633270 _g-924523017"  >
              <DashboardBadge tone={log.status === "FAILED" ? "danger" : "brand"}>{log.status}</DashboardBadge>
              <span className="is_Text _c-1589498260 _fs-553822623 _fv-2124220867"  >{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: branding.timezone }).format(log.createdAt)}</span>
            </div>
          </DashboardRow>
        ))}
      </DashboardPanel>
    </AppShell>
  );
}
