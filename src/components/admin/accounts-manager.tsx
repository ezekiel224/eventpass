"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, Save, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { Checkbox, Label } from "tamagui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import "./accounts-manager.css";
import "./admin-workspaces.css";

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

export function AccountsManager({ currentUserId, canDeleteAccounts }: { currentUserId: string; canDeleteAccounts: boolean }) {
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
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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

  async function deleteAccount() {
    if (!deletingUser || !csrf.token || deleteConfirmation.trim().toLowerCase() !== deletingUser.email.toLowerCase()) return;
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({ userId: deletingUser.id, confirmationEmail: deleteConfirmation })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not delete this account.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    setMessage(`Account ${data.deletedEmail} was permanently deleted. Its audit history was retained.`);
    setDeletingUser(null);
    setDeleteConfirmation("");
    await load();
  }

  const effectiveRoleSummary = useMemo(() => roles.filter((role) => editRoleIds.includes(role.id)).map((role) => role.name).join(", "), [editRoleIds, roles]);

  return (
    <div className="ep-admin-workspace ep-accounts-workspace">
      {(csrf.error || error || message) ? (
        <p className="ep-admin-notice" data-tone={csrf.error || error ? "error" : "success"} role="status">
          {csrf.error || error || message}
        </p>
      ) : null}

      <section className="ep-admin-overview">
        <header><div className="ep-admin-heading"><h2>Accounts</h2></div><Users aria-hidden="true" /></header>
        <dl className="ep-admin-metrics">
          <div><dt>Total accounts</dt><dd>{users.length}</dd></div>
          <div><dt>Active</dt><dd>{users.filter((user) => user.active).length}</dd></div>
          <div><dt>First login pending</dt><dd>{users.filter((user) => user.mustChangePassword).length}</dd></div>
          <div><dt>Assignable roles</dt><dd>{roles.length}</dd></div>
        </dl>
      </section>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Create account</h2><p>Every new account must change its temporary password on first sign-in.</p></div><UserPlus aria-hidden="true" /></header>
        <form className="ep-account-create-form" onSubmit={createAccount}>
          <div className="ep-account-identity-grid">
            <label>Email<Input name="email" type="email" autoComplete="off" required /></label>
            <label>Username<Input name="username" autoComplete="off" placeholder="Optional" /></label>
            <label>Display name<Input name="name" autoComplete="off" placeholder="Optional" /></label>
          </div>
          <fieldset className="ep-account-role-picker">
            <legend>Roles</legend>
            <div>
              {roles.map((role) => (
                <label key={role.id} className="ep-account-create-role">
                  <input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                  <span><b>{role.name}</b><span>{role.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ep-account-password-row">
            <label>Temporary password<Input id="temporary-password" name="temporaryPassword" type="text" autoComplete="off" placeholder="Leave blank to generate securely" /></label>
            <Button type="button" variant="secondary" onClick={() => {
              const input = document.getElementById("temporary-password") as HTMLInputElement | null;
              if (input) input.value = generatedPassword();
            }}><KeyRound className="h-4 w-4" /> Generate password</Button>
          </div>
          <footer><Button type="submit" disabled={!csrf.token || !selectedRoleIds.length} loading={saving} loadingLabel="Creating account…"><UserPlus className="h-4 w-4" /> Create account</Button></footer>
        </form>
        {temporaryPassword ? (
          <div className="ep-account-password-result">
            <p>One-time temporary password</p>
            <div>
              <code>{temporaryPassword}</code>
              <Button type="button" variant="secondary" className="px-3" onClick={() => void navigator.clipboard.writeText(temporaryPassword)}><Copy className="h-4 w-4" /> Copy</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header">
          <div className="ep-admin-heading"><h2>Team accounts</h2><p>{users.length} account{users.length === 1 ? "" : "s"}</p></div>
          <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Refresh accounts" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </header>
        <div className="ep-admin-table-wrap">
          <table className="ep-admin-table ep-account-table">
            <thead><tr><th>Account</th><th>Roles</th><th>Status</th><th>First login</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="ep-admin-table-empty" colSpan={5}>Loading accounts…</td></tr> : null}
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td><b>{user.name ?? user.username ?? user.email}</b><span>{user.email}</span></td>
                  <td>{user.roles.map((role) => role.name).join(", ") || "No role"}</td>
                  <td><span className="ep-admin-status" data-status={user.active ? "ready" : "disabled"}>{user.active ? "Active" : "Disabled"}</span></td>
                  <td>{user.mustChangePassword ? "Reset required" : "Complete"}</td>
                  <td><Button type="button" variant="secondary" disabled={user.id === currentUserId} onClick={() => startEdit(user)}><ShieldCheck className="h-4 w-4" /> Edit access</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PreviewSheet open={Boolean(editingUser)} onOpenChange={(open) => { if (!open && !saving) setEditingUser(null); }} title={editingUser ? `Edit ${editingUser.name ?? editingUser.username ?? editingUser.email}` : "Edit team member"} description={editingUser ? `${editingUser.email} · Roles: ${effectiveRoleSummary || "None"}` : "Update account access."} closeLabel="Close team member editor">
        {editingUser ? (
          <div className="ep-account-editor">
            <section className="ep-account-editor-section" aria-labelledby="account-role-heading">
              <div className="ep-account-editor-heading"><h3 id="account-role-heading">Assigned roles</h3><p>Roles provide the baseline permissions for this person.</p></div>
              <div className="ep-account-role-grid">
                {roles.map((role) => { const inputId = `edit-role-${role.id}`; return <div key={role.id} className="ep-account-choice"><Checkbox id={inputId} size="sm" checked={editRoleIds.includes(role.id)} onCheckedChange={() => toggleRole(role.id, true)}><Checkbox.Indicator><Check size={13} /></Checkbox.Indicator></Checkbox><Label htmlFor={inputId}><strong>{role.name}</strong><span>{role.description}</span></Label></div>; })}
              </div>
            </section>
            <section className="ep-account-status-row" aria-labelledby="account-status-heading"><div><h3 id="account-status-heading">Account status</h3><p>Disabled accounts cannot sign in or use existing sessions.</p></div><div className="ep-account-active-control"><Checkbox id="edit-account-active" size="sm" checked={editActive} onCheckedChange={(checked) => setEditActive(checked === true)}><Checkbox.Indicator><Check size={13} /></Checkbox.Indicator></Checkbox><Label htmlFor="edit-account-active">Active</Label></div></section>
            <section className="ep-account-editor-section" aria-labelledby="permission-override-heading">
              <div className="ep-account-editor-heading"><h3 id="permission-override-heading">Direct permission overrides</h3><p>Use sparingly. A direct choice wins over every assigned role.</p></div>
              <div className="ep-account-permission-grid">
                {permissions.map((permission) => (
                  <div key={permission.id} className="ep-account-permission-row">
                    <div><strong>{permission.slug}</strong><span>{permission.description}</span></div>
                    <OperationSelect compact label={`${permission.slug} permission`} value={editOverrides[permission.id] ?? "inherit"} options={[{ value: "inherit", label: "Inherit" }, { value: "allow", label: "Allow" }, { value: "deny", label: "Deny" }]} onValueChange={(value) => setEditOverrides((current) => ({ ...current, [permission.id]: value as "inherit" | "allow" | "deny" }))} />
                  </div>
                ))}
              </div>
            </section>
            {canDeleteAccounts ? (
              <section className="ep-account-danger-zone">
                <div><h3>Permanent account deletion</h3><p>Deletes credentials, role assignments, and permission overrides. Historical audit evidence remains.</p></div>
                <Button type="button" variant="danger" onClick={() => { setError(""); setDeletingUser(editingUser); setDeleteConfirmation(""); setEditingUser(null); }}><Trash2 className="h-4 w-4" /> Delete account</Button>
              </section>
            ) : null}
            <div className="ep-account-editor-actions">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="button" disabled={!csrf.token || !editRoleIds.length} loading={saving} loadingLabel="Saving access…" onClick={() => void saveAccess()}><Save className="h-4 w-4" /> Save access</Button>
            </div>
          </div>
        ) : null}
      </PreviewSheet>

      <LiquidModal open={Boolean(deletingUser)} onClose={() => { if (!saving) { setDeletingUser(null); setDeleteConfirmation(""); setError(""); } }} title="Delete this account permanently?" description="This security-sensitive action cannot be undone. Event and audit records are retained, but this person will no longer be able to sign in." size="sm" label={null}>
        {deletingUser ? (
          <div className="grid gap-5">
            <div className="rounded-[14px] border border-border/80 bg-background/70 p-4 text-sm">
              <strong className="block">{deletingUser.name ?? deletingUser.username ?? deletingUser.email}</strong>
              <span className="mt-1 block text-muted-foreground">{deletingUser.email}</span>
            </div>
            <label className="grid gap-2 text-sm font-medium">Type the account email to confirm<Input autoFocus type="email" autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={deletingUser.email} /></label>
            {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
            <p className="text-xs leading-5 text-muted-foreground">You cannot delete your own account or the final active administrator. Deletions appear in the audit log.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={() => { setDeletingUser(null); setDeleteConfirmation(""); }}>Cancel</Button>
              <Button type="button" variant="danger" disabled={deleteConfirmation.trim().toLowerCase() !== deletingUser.email.toLowerCase()} loading={saving} loadingLabel="Deleting account…" onClick={() => void deleteAccount()}><Trash2 className="h-4 w-4" /> Delete permanently</Button>
            </div>
          </div>
        ) : null}
      </LiquidModal>
    </div>
  );
}
