"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCsrfToken } from "@/hooks/useCsrfToken";

type Permission = { id: string; name: string; slug: string; description: string; system: boolean; roleCount: number; overrideCount: number };
type Role = { id: string; name: string; slug: string; description: string; system: boolean; assignable: boolean; userCount: number; permissionIds: string[] };
type AuditLog = { id: string; action: string; targetType: string; targetId: string | null; ipAddress: string | null; createdAt: string; actor: { email: string; name: string | null } | null };

export function PermissionsManager() {
  const csrf = useCsrfToken();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [roleResponse, permissionResponse, auditResponse] = await Promise.all([
      fetch("/api/admin/roles", { cache: "no-store" }),
      fetch("/api/admin/permissions", { cache: "no-store" }),
      fetch("/api/admin/audit", { cache: "no-store" })
    ]);
    if (!roleResponse.ok || !permissionResponse.ok) {
      setError("Could not load permission administration data.");
      return;
    }
    const [roleData, permissionData] = await Promise.all([roleResponse.json(), permissionResponse.json()]);
    setRoles(roleData.roles);
    setPermissions(permissionData.permissions);
    setDraftPermissions(Object.fromEntries(roleData.roles.map((role: Role) => [role.id, role.permissionIds])));
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      setAuditLogs(auditData.logs);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function togglePermission(roleId: string, permissionId: string) {
    setDraftPermissions((current) => {
      const assigned = current[roleId] ?? [];
      return {
        ...current,
        [roleId]: assigned.includes(permissionId)
          ? assigned.filter((id) => id !== permissionId)
          : [...assigned, permissionId]
      };
    });
  }

  async function saveRole(role: Role) {
    if (!csrf.token || role.system) return;
    setSavingId(role.id);
    setError("");
    const response = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        permissionIds: draftPermissions[role.id] ?? []
      })
    });
    const data = await response.json();
    setSavingId("");
    if (!response.ok) {
      setError(data.error ?? "Could not save role permissions.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    setMessage(`${role.name} permissions saved.`);
    await load();
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token) return;
    setSavingId("new-role");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        description: form.get("description"),
        permissionIds: []
      })
    });
    const data = await response.json();
    setSavingId("");
    if (!response.ok) {
      setError(data.error ?? "Could not create role.");
      return;
    }
    setMessage(`Role ${data.role.name} created. Assign permissions in the matrix.`);
    event.currentTarget.reset();
    await load();
  }

  async function createPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token) return;
    setSavingId("new-permission");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        description: form.get("description")
      })
    });
    const data = await response.json();
    setSavingId("");
    if (!response.ok) {
      setError(data.error ?? "Could not create permission.");
      return;
    }
    setMessage(`Permission ${data.permission.slug} created.`);
    event.currentTarget.reset();
    await load();
  }

  return (
    <div className="mt-6 grid gap-5">
      {(csrf.error || error || message) ? <p className={`rounded-xl border p-3 text-sm ${csrf.error || error ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{csrf.error || error || message}</p> : null}

      <Card className="p-5">
        <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /><div><h2 className="text-lg font-semibold">Role Permissions</h2><p className="mt-1 text-sm text-muted-foreground">System roles are visible but locked. Custom roles can be changed independently.</p></div></div>
        <div className="mt-5 overflow-x-auto">
          <table className="data-table w-full min-w-[900px] border-separate border-spacing-0 text-sm">
            <thead><tr><th className="sticky left-0 z-10 border-b border-border bg-card p-3 text-left">Permission</th>{roles.map((role) => <th key={role.id} className="min-w-32 border-b border-border p-3 text-center"><span className="block">{role.name}</span><span className="mt-1 block text-[10px] font-normal uppercase tracking-wider text-muted-foreground">{role.system ? "System" : `${role.userCount} users`}</span></th>)}</tr></thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id}>
                  <td className="sticky left-0 z-10 border-b border-border bg-card p-3"><code className="text-xs font-bold">{permission.slug}</code><span className="mt-1 block max-w-sm text-xs leading-5 text-muted-foreground">{permission.description}</span></td>
                  {roles.map((role) => {
                    const checked = (draftPermissions[role.id] ?? []).includes(permission.id);
                    return <td key={role.id} className="border-b border-border p-3 text-center"><input aria-label={`${permission.slug} for ${role.name}`} type="checkbox" checked={checked} disabled={role.system} onChange={() => togglePermission(role.id, permission.id)} className="h-5 w-5 accent-primary disabled:opacity-50" /></td>;
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="sticky left-0 bg-card p-3 text-xs text-muted-foreground">Save each custom role independently.</td>{roles.map((role) => <td key={role.id} className="p-3 text-center">{role.system ? <span className="text-xs text-muted-foreground">Locked</span> : <Button type="button" className="h-9 px-3" disabled={savingId === role.id || !csrf.token} onClick={() => void saveRole(role)}>{savingId === role.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save</Button>}</td>)}</tr></tfoot>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">New Role</h2>
          <p className="mt-1 text-sm text-muted-foreground">New roles start with no permissions.</p>
          <form className="mt-4 grid gap-3" onSubmit={createRole}>
            <Input name="name" placeholder="Role name" required />
            <Input name="slug" placeholder="role-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            <Input name="description" placeholder="Role description" required />
            <Button className="justify-self-end" disabled={savingId === "new-role" || !csrf.token}>{savingId === "new-role" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create role</Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">New Permission</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use a scoped slug such as <code>reports:export</code>.</p>
          <form className="mt-4 grid gap-3" onSubmit={createPermission}>
            <Input name="name" placeholder="Permission name" required />
            <Input name="slug" placeholder="resource:action" pattern="[a-z][a-z0-9-]*:[a-z][a-z0-9-]*" required />
            <Input name="description" placeholder="Permission description" required />
            <Button className="justify-self-end" disabled={savingId === "new-permission" || !csrf.token}>{savingId === "new-permission" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Create permission</Button>
          </form>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <div className="mt-4 divide-y divide-border">
          {auditLogs.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No audited administrative actions yet.</p> : auditLogs.slice(0, 20).map((log) => (
            <div key={log.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]">
              <div><b>{log.action}</b><span className="ml-2 text-muted-foreground">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</span><span className="mt-1 block text-xs text-muted-foreground">{log.actor?.name ?? log.actor?.email ?? "Deleted account"} · {log.ipAddress ?? "IP unavailable"}</span></div>
              <time className="text-xs text-muted-foreground" dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
