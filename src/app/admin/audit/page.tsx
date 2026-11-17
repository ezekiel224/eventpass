import { forbidden } from "next/navigation";
import { AuditLogView } from "@/components/admin/audit-log-view";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { isAdministrator, requirePermission } from "@/lib/authorization";

export default async function AuditPage() {
  const authorization = await requirePermission("audit:view");
  if (!isAdministrator(authorization)) forbidden();

  return (
    <AppShell active="Audit Trail">
      <PageTitle title="Audit Trail" />
      <AuditLogView />
    </AppShell>
  );
}
