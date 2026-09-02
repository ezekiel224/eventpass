"use client";

import { AlertCircle, CheckCircle2, Image as ImageIcon, KeyRound, Save, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Organization identity</h2>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={saveBranding}>
          <label className="grid gap-2 text-sm font-semibold">Organization name<Input value={branding.name} onChange={(event) => setField("name", event.target.value)} placeholder="Organization name" disabled={loading} required /></label>
          <div className="grid gap-3 sm:grid-cols-[5rem_1fr] sm:items-end">
            <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-muted/50 bg-contain bg-center bg-no-repeat text-muted-foreground" style={branding.logoUrl ? { backgroundImage: `url(${branding.logoUrl})` } : undefined}>{branding.logoUrl ? null : <ImageIcon className="h-6 w-6" />}</div>
            <label className="grid gap-2 text-sm font-semibold">Logo URL<Input value={branding.logoUrl} onChange={(event) => setField("logoUrl", event.target.value)} placeholder="https://example.com/logo.png" type="url" disabled={loading} /><span className="text-xs font-normal text-muted-foreground">Use a square or horizontal image with a transparent background.</span></label>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
            <div className="absolute inset-y-0 left-0 w-px bg-primary shadow-[0_0_22px_hsl(var(--primary))]" />
            <p className="text-sm font-semibold">Interface Theme</p>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">Colors, contrast, and light and dark mode treatments are governed by the EventPass design system. This keeps every operator workspace and attendee touchpoint consistent, accessible, and production-ready.</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold">Default timezone<select value={branding.timezone} onChange={(event) => setField("timezone", event.target.value)} disabled={loading} className="focus-ring h-11 rounded-xl border border-border/80 bg-background px-3 text-sm font-normal">{!commonTimezones.includes(branding.timezone) ? <option value={branding.timezone}>{branding.timezone}</option> : null}{commonTimezones.map((timezone) => <option key={timezone} value={timezone}>{timezone.replaceAll("_", " ")}</option>)}</select><span className="text-xs font-normal text-muted-foreground">Used for event dates, emails, and operational timestamps.</span></label>
          <label className="grid gap-2 text-sm font-semibold">Custom domain<Input value={branding.domain} onChange={(event) => setField("domain", event.target.value)} placeholder="events.example.com" disabled={loading} /><span className="text-xs font-normal text-muted-foreground">Display-only until DNS and deployment routing are configured.</span></label>
          {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-foreground"}`}>{notice.tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}{notice.text}</p> : null}
          <Button className="w-fit" type="submit" disabled={loading}><Save className="h-4 w-4" /> Save identity</Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Email delivery</h2>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="control-panel p-4">
            <p className="panel-label">Provider</p>
            <p className="mt-1 font-semibold">{email.provider}</p>
          </div>
          <div className="control-panel p-4">
            <p className="panel-label">From address</p>
            <p className="mt-1 font-semibold">{email.from || "Set EMAIL_FROM in .env"}</p>
          </div>
          <div className="control-panel p-4">
            <p className="panel-label">Resend API key</p>
            <p className={email.resendConfigured ? "mt-1 font-semibold text-accent" : "mt-1 font-semibold text-destructive"}>
              {email.resendConfigured ? "Configured" : "Missing"}
            </p>
          </div>
          <p className="text-muted-foreground">Email settings are managed from `.env` so production deploys stay explicit and secret-safe.</p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6 xl:col-span-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">User management</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/admin/settings/accounts" className="choice-tile focus-ring p-4">
            <p className="font-semibold">Accounts</p>
            <p className="mt-2 text-sm text-muted-foreground">Create accounts, assign roles, and set direct permission overrides.</p>
          </Link>
          <Link href="/admin/settings/permissions" className="choice-tile focus-ring p-4">
            <p className="font-semibold">Roles & permissions</p>
            <p className="mt-2 text-sm text-muted-foreground">Manage the permission matrix, custom roles, and security audit history.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
