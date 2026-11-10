"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import "./admin-workspaces.css";

type Permission = { id: string; name: string; slug: string; description: string; system: boolean; roleCount: number; overrideCount: number };
type Role = { id: string; name: string; slug: string; description: string; system: boolean; assignable: boolean; userCount: number; permissionIds: string[] };

export function PermissionsManager() {
  const csrf = useCsrfToken();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [roleResponse, permissionResponse] = await Promise.all([
      fetch("/api/admin/roles", { cache: "no-store" }),
      fetch("/api/admin/permissions", { cache: "no-store" })
    ]);
    if (!roleResponse.ok || !permissionResponse.ok) {
      setError("Could not load permission administration data.");
      return;
    }
    const [roleData, permissionData] = await Promise.all([roleResponse.json(), permissionResponse.json()]);
    setRoles(roleData.roles);
    setPermissions(permissionData.permissions);
    setDraftPermissions(Object.fromEntries(roleData.roles.map((role: Role) => [role.id, role.permissionIds])));
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

  const customRoleCount = roles.filter((role) => !role.system).length;

  return (
    <div className="ep-admin-workspace ep-permissions-workspace">
      {(csrf.error || error || message) ? <p className="ep-admin-notice" data-tone={csrf.error || error ? "error" : "success"}>{csrf.error || error || message}</p> : null}

      <section className="ep-admin-overview">
        <header><div className="ep-admin-heading"><h2>Roles and permissions</h2></div><ShieldCheck aria-hidden="true" /></header>
        <dl className="ep-admin-metrics">
          <div><dt>Roles</dt><dd>{roles.length}</dd></div>
          <div><dt>Custom roles</dt><dd>{customRoleCount}</dd></div>
          <div><dt>Permissions</dt><dd>{permissions.length}</dd></div>
          <div><dt>Assigned users</dt><dd>{roles.reduce((total, role) => total + role.userCount, 0)}</dd></div>
        </dl>
      </section>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Permission matrix</h2><p>System roles are locked.</p></div><ShieldCheck aria-hidden="true" /></header>
        <div className="ep-admin-table-wrap">
          <table className="ep-admin-table ep-permission-table">
            <thead><tr><th>Permission</th>{roles.map((role) => <th key={role.id}><span>{role.name}</span><small>{role.system ? "System" : `${role.userCount} users`}</small></th>)}</tr></thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id}>
                  <td><code>{permission.slug}</code><span>{permission.description}</span></td>
                  {roles.map((role) => {
                    const checked = (draftPermissions[role.id] ?? []).includes(permission.id);
                    return <td key={role.id}><input aria-label={`${permission.slug} for ${role.name}`} type="checkbox" checked={checked} disabled={role.system} onChange={() => togglePermission(role.id, permission.id)} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Save each custom role independently.</td>{roles.map((role) => <td key={role.id}>{role.system ? <span>Locked</span> : <Button type="button" disabled={savingId === role.id || !csrf.token} onClick={() => void saveRole(role)}>{savingId === role.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save</Button>}</td>)}</tr></tfoot>
          </table>
        </div>
      </section>

      <div className="ep-admin-form-pair">
        <section className="ep-admin-panel">
          <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>New role</h2><p>New roles begin with no permissions.</p></div><Plus aria-hidden="true" /></header>
          <form className="ep-admin-compact-form" onSubmit={createRole}>
            <label>Name<Input name="name" placeholder="Event coordinator" required /></label>
            <label>Slug<Input name="slug" placeholder="event-coordinator" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label>Description<Input name="description" placeholder="What this role is responsible for" required /></label>
            <footer><Button disabled={savingId === "new-role" || !csrf.token}>{savingId === "new-role" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create role</Button></footer>
          </form>
        </section>
        <section className="ep-admin-panel">
          <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>New permission</h2><p>Use a scoped slug such as <code>reports:export</code>.</p></div><KeyRound aria-hidden="true" /></header>
          <form className="ep-admin-compact-form" onSubmit={createPermission}>
            <label>Name<Input name="name" placeholder="Export reports" required /></label>
            <label>Slug<Input name="slug" placeholder="reports:export" pattern="[a-z][a-z0-9-]*:[a-z][a-z0-9-]*" required /></label>
            <label>Description<Input name="description" placeholder="What this permission allows" required /></label>
            <footer><Button disabled={savingId === "new-permission" || !csrf.token}>{savingId === "new-permission" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Create permission</Button></footer>
          </form>
        </section>
      </div>
    </div>
  );
}
