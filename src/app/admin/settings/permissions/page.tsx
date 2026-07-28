import { PermissionsManager } from "@/components/admin/permissions-manager";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { requirePermission } from "@/lib/authorization";

export default async function PermissionsPage() {
  await requirePermission("roles:view");
  await requirePermission("permissions:view");

  return (
    <AppShell active="Permissions">
      <PageTitle eyebrow="Security administration" title="Roles, permissions, and audit history." />
      <PermissionsManager />
    </AppShell>
  );
}
