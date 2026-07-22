"use client";

import { useMemo, useState } from "react";
import { Eye, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { PassExperience } from "@/components/pass/pass-experience";
import {
  GenericVariant,
  NormalizedPassData,
  PassFace,
  PassThemeId,
  passThemeIds,
  passThemeRegistry
} from "@/components/pass/pass-system";
import { Button } from "@/components/ui/button";
import { Card, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PassThemePreview({ baseData }: { baseData: NormalizedPassData }) {
  const [theme, setTheme] = useState<PassThemeId>("casino");
  const [face, setFace] = useState<PassFace>("front");
  const [accentColor, setAccentColor] = useState(baseData.accentColor);
  const [passType, setPassType] = useState(baseData.passType);
  const [attendeeName, setAttendeeName] = useState(baseData.attendeeName);
  const [mobileWidth, setMobileWidth] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [genericVariant, setGenericVariant] = useState<GenericVariant>("dark");
  const [longContent, setLongContent] = useState(false);
  const [missingOptional, setMissingOptional] = useState(false);

  const previewData = useMemo<NormalizedPassData>(() => ({
    ...baseData,
    attendeeName: longContent ? "Alexandria Montgomery-Worthington the Third" : attendeeName || "Attendee",
    eventName: longContent ? "International Symposium for Extraordinary Emerging Ideas and Discovery" : baseData.eventName,
    passType: passType || "General",
    accentColor,
    ...(missingOptional ? {
      eventSubtitle: null,
      company: null,
      gate: null,
      raffleTickets: null,
      backgroundImage: null,
      customMessage: null,
      companionName: null,
      advisories: [],
      perks: [],
      sponsorLogos: []
    } : {})
  }), [accentColor, attendeeName, baseData, longContent, missingOptional, passType]);

  return (
    <div className="mt-6 grid gap-6">
      <GlassCard className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">Theme
            <select value={theme} onChange={(event) => setTheme(event.target.value as PassThemeId)} className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm">
              {passThemeIds.map((themeId) => <option key={themeId} value={themeId}>{passThemeRegistry[themeId].label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Attendee name
            <Input value={attendeeName} onChange={(event) => setAttendeeName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">Pass type
            <Input value={passType} onChange={(event) => setPassType(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">Organizer accent
            <span className="flex h-10 items-center gap-3 rounded-xl border border-border bg-background px-3">
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-7 w-10 cursor-pointer border-0 bg-transparent" aria-label="Organizer accent color" />
              <span className="font-mono text-xs text-muted-foreground">{accentColor}</span>
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant={face === "front" ? "primary" : "secondary"} onClick={() => setFace("front")}><Eye className="h-4 w-4" /> Front</Button>
          <Button type="button" variant={face === "back" ? "primary" : "secondary"} onClick={() => setFace("back")}><RotatePreviewIcon /> Back</Button>
          <Button type="button" variant={mobileWidth ? "primary" : "secondary"} onClick={() => setMobileWidth((value) => !value)}><Smartphone className="h-4 w-4" /> Mobile width</Button>
          <Button type="button" variant={reducedMotion ? "primary" : "secondary"} onClick={() => setReducedMotion((value) => !value)}><Monitor className="h-4 w-4" /> Reduced motion</Button>
          <Button type="button" variant={longContent ? "primary" : "secondary"} onClick={() => setLongContent((value) => !value)}>Long-content test</Button>
          <Button type="button" variant={missingOptional ? "primary" : "secondary"} onClick={() => setMissingOptional((value) => !value)}>Missing-fields test</Button>
          <Button type="button" variant="secondary" onClick={() => setGenericVariant((value) => value === "dark" ? "light" : "dark")}>
            {genericVariant === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Generic {genericVariant}
          </Button>
        </div>
      </GlassCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="grid min-h-[760px] place-items-center overflow-hidden p-5 sm:p-8">
          <div className={`grid w-full place-items-center transition-[max-width] ${mobileWidth ? "max-w-[310px]" : "max-w-[560px]"}`}>
            <PassExperience
              key={`${theme}-${genericVariant}`}
              data={previewData}
              theme={theme}
              genericVariant={genericVariant}
              face={face}
              onFaceChange={setFace}
              forceReducedMotion={reducedMotion}
            />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Selected preset</p>
          <h2 className="mt-2 text-2xl font-semibold">{passThemeRegistry[theme].label}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{passThemeRegistry[theme].description}</p>
          <dl className="mt-6 grid gap-4 text-sm">
            <div><dt className="text-muted-foreground">Data source</dt><dd className="mt-1 font-medium">Existing attendee, event, pass, QR, and branding records</dd></div>
            <div><dt className="text-muted-foreground">Current face</dt><dd className="mt-1 font-medium capitalize">{face}</dd></div>
            <div><dt className="text-muted-foreground">Viewport</dt><dd className="mt-1 font-medium">{mobileWidth ? "Narrow mobile" : "Responsive desktop"}</dd></div>
            <div><dt className="text-muted-foreground">Motion</dt><dd className="mt-1 font-medium">{reducedMotion ? "Forced reduced" : "System preference"}</dd></div>
          </dl>
        </Card>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Same data, seven systems</p><h2 className="mt-2 text-2xl font-semibold">Theme comparison</h2></div>
          <p className="max-w-xl text-sm text-muted-foreground">Each card below uses the same normalized pass object. Click any pass to inspect its reverse.</p>
        </div>
        <div className="mt-5 grid gap-8 md:grid-cols-2 2xl:grid-cols-3">
          {passThemeIds.map((themeId) => (
            <article key={themeId} className="grid justify-items-center gap-3 rounded-3xl border border-border bg-card/55 p-5">
              <div className="w-full max-w-[292px]"><PassExperience data={previewData} theme={themeId} genericVariant={themeId === "minimal" ? genericVariant : "dark"} forceReducedMotion={reducedMotion} staticPreview /></div>
              <div className="text-center"><h3 className="font-semibold">{passThemeRegistry[themeId].label}</h3><p className="mt-1 text-xs text-muted-foreground">{passThemeRegistry[themeId].description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Generic variants</p>
        <h2 className="mt-2 text-2xl font-semibold">Light and dark production finishes</h2>
        <div className="mt-5 grid gap-8 md:grid-cols-2">
          {(["light", "dark"] as const).map((variant) => (
            <article key={variant} className="grid justify-items-center gap-3 rounded-3xl border border-border bg-card/55 p-5">
              <div className="w-full max-w-[340px]"><PassExperience data={previewData} theme="minimal" genericVariant={variant} forceReducedMotion={reducedMotion} staticPreview /></div>
              <h3 className="flex items-center gap-2 font-semibold capitalize">{variant === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {variant}</h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RotatePreviewIcon() {
  return <span className="text-base leading-none" aria-hidden="true">↻</span>;
}
