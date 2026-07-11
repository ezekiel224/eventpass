"use client";

import { KeyRound, Palette, Save, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hexToHslParts } from "@/lib/color";

type BrandingState = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  timezone: string;
  domain: string;
};

type EmailState = {
  provider: string;
  from: string;
  resendConfigured: boolean;
};

const emptyBranding: BrandingState = {
  name: "",
  logoUrl: "",
  primaryColor: "#14f1cc",
  accentColor: "#14f1cc",
  timezone: "America/Chicago",
  domain: ""
};

export function SettingsManager() {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingState>(emptyBranding);
  const [email, setEmail] = useState<EmailState>({ provider: "console", from: "", resendConfigured: false });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    const response = await fetch("/api/settings/branding", { cache: "no-store" });
    const data = await response.json();
    setBranding({
      name: data.organization.name ?? "",
      logoUrl: data.organization.logoUrl ?? "",
      primaryColor: data.organization.primaryColor ?? "#14f1cc",
      accentColor: data.organization.accentColor ?? "#14f1cc",
      timezone: data.organization.timezone ?? "America/Chicago",
      domain: data.organization.domain ?? ""
    });
    setEmail(data.email);
    setLoading(false);
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
    setMessage("");
    if (!/^#[0-9a-fA-F]{6}$/.test(branding.primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(branding.accentColor)) {
      setMessage("Use valid 6-digit hex colors, for example #FF69B4.");
      return;
    }

    const response = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branding)
    });

    if (response.ok) {
      setMessage("Branding saved.");
      document.documentElement.style.setProperty("--primary", hexToHslParts(branding.primaryColor, "168 92% 48%"));
      document.documentElement.style.setProperty("--accent", hexToHslParts(branding.accentColor, "168 92% 48%"));
      await loadSettings();
      router.refresh();
    } else {
      setMessage("Could not save branding. Check the fields and try again.");
    }
  }

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Organization branding</h2>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={saveBranding}>
          <Input value={branding.name} onChange={(event) => setField("name", event.target.value)} placeholder="Organization name" disabled={loading} />
          <Input value={branding.logoUrl} onChange={(event) => setField("logoUrl", event.target.value)} placeholder="Logo URL" disabled={loading} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-muted-foreground">
              Primary color
              <Input value={branding.primaryColor} onChange={(event) => setField("primaryColor", event.target.value)} placeholder="#14f1cc" type="color" disabled={loading} />
            </label>
            <label className="grid gap-2 text-sm text-muted-foreground">
              Accent color
              <Input value={branding.accentColor} onChange={(event) => setField("accentColor", event.target.value)} placeholder="#14f1cc" type="color" disabled={loading} />
            </label>
          </div>
          <Input value={branding.timezone} onChange={(event) => setField("timezone", event.target.value)} placeholder="Timezone" disabled={loading} />
          <Input value={branding.domain} onChange={(event) => setField("domain", event.target.value)} placeholder="Custom domain" disabled={loading} />
          {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
          <Button className="w-fit" type="submit" disabled={loading}><Save className="h-4 w-4" /> Save branding</Button>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Email delivery</h2>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted-foreground">Provider</p>
            <p className="mt-1 font-semibold">{email.provider}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted-foreground">From address</p>
            <p className="mt-1 font-semibold">{email.from || "Set EMAIL_FROM in .env"}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted-foreground">Resend API key</p>
            <p className={email.resendConfigured ? "mt-1 font-semibold text-accent" : "mt-1 font-semibold text-destructive"}>
              {email.resendConfigured ? "Configured" : "Missing"}
            </p>
          </div>
          <p className="text-muted-foreground">Email settings are managed from `.env` so production deploys stay explicit and secret-safe.</p>
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">User management</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["Admin", "Staff", "Super Admin"].map((role) => (
            <div key={role} className="rounded-xl border border-border p-4">
              <p className="font-semibold">{role}</p>
              <p className="mt-2 text-sm text-muted-foreground">Role-based permissions for dashboard access and check-in operations.</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
