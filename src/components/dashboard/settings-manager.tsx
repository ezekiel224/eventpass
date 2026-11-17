"use client";

import { AlertCircle, CheckCircle2, ChevronRight, Image as ImageIcon, KeyRound, Save, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OperationSelect } from "@/components/ui/operation-select";
import "../admin/admin-workspaces.css";

type BrandingState = {
  name: string;
  logoUrl: string;
  timezone: string;
  domain: string;
};

type EmailState = {
  provider: string;
  from: string;
  resendConfigured: boolean;
};

type Notice = { tone: "success" | "error"; text: string } | null;

const commonTimezones = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC"
];

const emptyBranding: BrandingState = {
  name: "",
  logoUrl: "",
  timezone: "America/Chicago",
  domain: ""
};

export function SettingsManager() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingState>(emptyBranding);
  const [email, setEmail] = useState<EmailState>({ provider: "console", from: "", resendConfigured: false });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/branding", { cache: "no-store" });
      if (!response.ok) throw new Error("Settings could not be loaded.");
      const data = await response.json();
      setBranding({
        name: data.organization.name ?? "",
        logoUrl: data.organization.logoUrl ?? "",
        timezone: data.organization.timezone ?? "America/Chicago",
        domain: data.organization.domain ?? ""
      });
      setEmail(data.email);
    } catch {
      setNotice({ tone: "error", text: "Settings could not be loaded. Refresh the page to try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
  }, []);

  function setField(name: keyof BrandingState, value: string) {
    setBranding((current) => ({ ...current, [name]: value }));
  }

  async function saveBranding(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    const response = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branding)
    });

    if (response.ok) {
      setNotice({ tone: "success", text: "Organization identity saved." });
      await loadSettings();
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      setNotice({ tone: "error", text: typeof data.error === "string" ? data.error : "Could not save organization identity. Check the fields and try again." });
    }
  }

  return (
    <div className="ep-admin-workspace ep-settings-workspace">
      <section className="ep-admin-overview">
        <header><div className="ep-admin-heading"><h2>Workspace settings</h2></div><ShieldCheck aria-hidden="true" /></header>
        <dl className="ep-admin-metrics">
          <div><dt>Organization</dt><dd>{branding.name || "Not set"}</dd></div>
          <div><dt>Timezone</dt><dd>{branding.timezone.replaceAll("_", " ")}</dd></div>
          <div><dt>Email provider</dt><dd>{email.provider}</dd></div>
          <div><dt>Delivery status</dt><dd data-status={email.resendConfigured ? "ready" : "attention"}>{email.resendConfigured ? "Ready" : "Needs setup"}</dd></div>
        </dl>
      </section>

      {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className="ep-admin-notice" data-tone={notice.tone}>{notice.tone === "error" ? <AlertCircle /> : <CheckCircle2 />}{notice.text}</p> : null}

      <div className="ep-settings-layout">
        <section className="ep-admin-panel">
          <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Organization</h2></div><ShieldCheck aria-hidden="true" /></header>
          <form className="ep-settings-form" onSubmit={saveBranding}>
            <label>Organization name<Input value={branding.name} onChange={(event) => setField("name", event.target.value)} placeholder="Organization name" disabled={loading} required /></label>
            <div className="ep-settings-logo-field"><div className="ep-settings-logo-preview" style={branding.logoUrl ? { backgroundImage: `url(${branding.logoUrl})` } : undefined}>{branding.logoUrl ? null : <ImageIcon />}</div><label>Logo URL<Input value={branding.logoUrl} onChange={(event) => setField("logoUrl", event.target.value)} placeholder="https://example.com/logo.png" type="url" disabled={loading} /><span>Use a square or horizontal image with a transparent background.</span></label></div>
            <label>Default timezone<OperationSelect label="Default timezone" value={branding.timezone} onValueChange={(value) => setField("timezone", value)} disabled={loading} options={[...(!commonTimezones.includes(branding.timezone) ? [{ value: branding.timezone, label: branding.timezone.replaceAll("_", " ") }] : []), ...commonTimezones.map((timezone) => ({ value: timezone, label: timezone.replaceAll("_", " ") }))]} /><span>Used for event dates, emails, and operational timestamps.</span></label>
            <label>Custom domain<Input value={branding.domain} onChange={(event) => setField("domain", event.target.value)} placeholder="events.example.com" disabled={loading} /><span>Display-only until DNS and deployment routing are configured.</span></label>
            <footer><Button type="submit" loading={loading} loadingLabel="Saving identity…"><Save className="h-4 w-4" /> Save identity</Button></footer>
          </form>
        </section>

        <section className="ep-admin-panel">
          <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Email delivery</h2></div><KeyRound aria-hidden="true" /></header>
          <dl className="ep-settings-delivery-list">
            <div><dt>Provider</dt><dd>{email.provider}</dd></div>
            <div><dt>From address</dt><dd>{email.from || "Set EMAIL_FROM in .env"}</dd></div>
            <div><dt>Resend API key</dt><dd data-status={email.resendConfigured ? "ready" : "attention"}>{email.resendConfigured ? "Configured" : "Missing"}</dd></div>
          </dl>
          <p className="ep-admin-panel-note">Email settings remain environment-managed so production secrets stay explicit and out of the browser.</p>
        </section>
      </div>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Access</h2></div><Users aria-hidden="true" /></header>
        <nav className="ep-admin-route-list" aria-label="Access administration">
          <Link href="/admin/settings/accounts"><div><strong>Accounts</strong><span>Create accounts, assign roles, and set direct permission overrides.</span></div><ChevronRight /></Link>
          <Link href="/admin/settings/permissions"><div><strong>Roles & permissions</strong><span>Manage the permission matrix and create scoped roles or permissions.</span></div><ChevronRight /></Link>
        </nav>
      </section>
    </div>
  );
}
