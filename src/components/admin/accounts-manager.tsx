"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Loader2, RefreshCw, Save, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";
import { useCsrfToken } from "@/hooks/useCsrfToken";

type Role = { id: string; name: string; slug: string; description: string; system: boolean; assignable: boolean; permissionIds: string[] };
type Permission = { id: string; name: string; slug: string; description: string };
type User = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  roles: Array<{ id: string; name: string; slug: string }>;
  overrides: Array<{ permissionId: string; permissionSlug: string; allowed: boolean }>;
};

function generatedPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + symbols[bytes[0] % symbols.length] + "aA1";
}

export function AccountsManager({ currentUserId }: { currentUserId: string }) {
  const csrf = useCsrfToken();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [editOverrides, setEditOverrides] = useState<Record<string, "inherit" | "allow" | "deny">>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [usersResponse, rolesResponse, permissionsResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/roles", { cache: "no-store" }),
      fetch("/api/admin/permissions", { cache: "no-store" })
    ]);
    if (!usersResponse.ok || !rolesResponse.ok || !permissionsResponse.ok) {
      setError("Could not load account administration data.");
      setLoading(false);
      return;
    }
    const [usersData, rolesData, permissionsData] = await Promise.all([
      usersResponse.json(),
      rolesResponse.json(),
      permissionsResponse.json()
    ]);
    setUsers(usersData.users);
    setRoles(rolesData.roles.filter((role: Role) => role.assignable));
    setPermissions(permissionsData.permissions);
    setSelectedRoleIds((current) => current.length ? current : [rolesData.roles.find((role: Role) => role.slug === "user")?.id].filter(Boolean));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function toggleRole(roleId: string, editing = false) {
    const setter = editing ? setEditRoleIds : setSelectedRoleIds;
    setter((current) => current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token || !selectedRoleIds.length) return;
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const suppliedPassword = String(form.get("temporaryPassword") ?? "").trim();
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        email: form.get("email"),
        username: String(form.get("username") ?? "").trim() || undefined,
        name: String(form.get("name") ?? "").trim() || undefined,
        roleIds: selectedRoleIds,
        temporaryPassword: suppliedPassword || undefined
      })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create account.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    setTemporaryPassword(data.temporaryPassword ?? suppliedPassword);
    setMessage(`Account created for ${data.user.email}. Copy the temporary password now; it will not be shown again.`);
    event.currentTarget.reset();
    await load();
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setEditRoleIds(user.roles.map((role) => role.id));
    setEditActive(user.active);
    setEditOverrides(Object.fromEntries(user.overrides.map((override) => [
      override.permissionId,
      override.allowed ? "allow" : "deny"
    ])));
    setError("");
    setMessage("");
  }

  async function saveAccess() {
    if (!editingUser || !csrf.token || !editRoleIds.length) return;
    setSaving(true);
    setError("");
    const overrides = Object.entries(editOverrides)
      .filter(([, value]) => value !== "inherit")
      .map(([permissionId, value]) => ({ permissionId, allowed: value === "allow" }));
    const response = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        userId: editingUser.id,
        roleIds: editRoleIds,
        active: editActive,
        overrides
      })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save account access.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    setMessage(`Access updated for ${data.user.email}.`);
    setEditingUser(null);
    await load();
  }

  const effectiveRoleSummary = useMemo(() => roles.filter((role) => editRoleIds.includes(role.id)).map((role) => role.name).join(", "), [editRoleIds, roles]);

  return (
    <div className="mt-6 grid gap-5">
      {(csrf.error || error || message) ? (
        <p className={`rounded-xl border p-3 text-sm ${csrf.error || error ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`} role="status">
          {csrf.error || error || message}
        </p>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Create account</h2><p className="mt-1 text-sm text-muted-foreground">Every new account must change its temporary password on first sign-in.</p></div>
          <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <form className="mt-5 grid gap-4" onSubmit={createAccount}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">Email<Input name="email" type="email" autoComplete="off" required /></label>
            <label className="grid gap-1.5 text-sm font-medium">Username<Input name="username" autoComplete="off" placeholder="Optional" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Display name<Input name="name" autoComplete="off" placeholder="Optional" /></label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Roles</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <label key={role.id} className="flex cursor-pointer gap-3 rounded-xl border border-border p-3">
                  <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                  <span><b className="block text-sm">{role.name}</b><span className="mt-1 block text-xs leading-5 text-muted-foreground">{role.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-1.5 text-sm font-medium">Temporary password<Input id="temporary-password" name="temporaryPassword" type="text" autoComplete="off" placeholder="Leave blank to generate securely" /></label>
            <Button type="button" variant="secondary" onClick={() => {
              const input = document.getElementById("temporary-password") as HTMLInputElement | null;
              if (input) input.value = generatedPassword();
            }}><KeyRound className="h-4 w-4" /> Generate password</Button>
          </div>
          <Button className="justify-self-end" type="submit" disabled={saving || !csrf.token || !selectedRoleIds.length}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create account
          </Button>
        </form>
        {temporaryPassword ? (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">One-time temporary password</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 text-sm">{temporaryPassword}</code>
              <Button type="button" variant="secondary" className="px-3" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}><Copy className="h-4 w-4" /> Copy</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Administrative accounts</h2><p className="mt-1 text-sm text-muted-foreground">{users.length} account{users.length === 1 ? "" : "s"}</p></div>
          <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Refresh accounts" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground"><tr><th className="py-3">Account</th><th>Roles</th><th>Status</th><th>First login</th><th className="text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td className="py-6 text-muted-foreground" colSpan={5}>Loading accounts…</td></tr> : null}
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4"><b>{user.name ?? user.username ?? user.email}</b><span className="mt-1 block text-xs text-muted-foreground">{user.email}</span></td>
                  <td>{user.roles.map((role) => role.name).join(", ") || "No role"}</td>
                  <td><span className={user.active ? "text-emerald-600" : "text-destructive"}>{user.active ? "Active" : "Disabled"}</span></td>
                  <td>{user.mustChangePassword ? "Reset required" : "Complete"}</td>
                  <td className="text-right"><Button type="button" variant="secondary" disabled={user.id === currentUserId} onClick={() => startEdit(user)}>Manage</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LiquidModal open={Boolean(editingUser)} onClose={() => setEditingUser(null)} title={editingUser ? `Manage ${editingUser.email}` : "Manage account"} description={`Assigned roles: ${effectiveRoleSummary || "None"}. Direct overrides take precedence over inherited role permissions.`} size="lg">
        {editingUser ? (
          <div className="grid gap-5">
            <fieldset className="form-section p-4">
              <legend className="text-sm font-medium">Assigned roles</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((role) => <label key={role.id} className="choice-tile flex items-center gap-2 px-3 py-2 text-sm"><input type="checkbox" checked={editRoleIds.includes(role.id)} onChange={() => toggleRole(role.id, true)} className="h-4 w-4 accent-primary" />{role.name}</label>)}
              </div>
            </fieldset>
            <label className="choice-tile flex items-center gap-3 p-4 text-sm font-medium"><input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} className="h-4 w-4 accent-primary" />Account active</label>
            <fieldset className="form-section p-4">
              <legend className="text-sm font-medium">Direct permission overrides</legend>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {permissions.map((permission) => (
                  <label key={permission.id} className="choice-tile grid grid-cols-[1fr_auto] items-center gap-3 p-3">
                    <span><b className="block text-sm">{permission.slug}</b><span className="mt-1 block text-xs text-muted-foreground">{permission.description}</span></span>
                    <select className="focus-ring h-9 rounded-lg border border-border bg-background px-2 text-xs" value={editOverrides[permission.id] ?? "inherit"} onChange={(event) => setEditOverrides((current) => ({ ...current, [permission.id]: event.target.value as "inherit" | "allow" | "deny" }))}>
                      <option value="inherit">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option>
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="button" disabled={saving || !csrf.token || !editRoleIds.length} onClick={() => void saveAccess()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save access</Button>
            </div>
          </div>
        ) : null}
      </LiquidModal>
    </div>
  );
}
