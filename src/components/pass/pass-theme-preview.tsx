"use client";

import { useMemo, useState } from "react";
import { Maximize2, Smartphone } from "lucide-react";
import { PassExperience } from "@/components/pass/pass-experience";
import type { NormalizedPassData } from "@/components/pass/pass-system";
import { Button } from "@/components/ui/button";
import { Card, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PassThemePreview({ baseData }: { baseData: NormalizedPassData }) {
  const [passType, setPassType] = useState(baseData.passType);
  const [attendeeName, setAttendeeName] = useState(baseData.attendeeName);
  const [mobileWidth, setMobileWidth] = useState(false);
  const [longContent, setLongContent] = useState(false);
  const [missingOptional, setMissingOptional] = useState(false);

  const previewData = useMemo<NormalizedPassData>(() => ({
    ...baseData,
    attendeeName: longContent ? "Alexandria Montgomery-Worthington" : attendeeName || "Attendee",
    eventName: longContent ? "International Symposium for Emerging Ideas" : baseData.eventName,
    passType: passType || "General",
    ...(missingOptional ? {
      company: null,
      raffleTickets: null,
      companionName: null,
      venueLocation: null,
      under21Alert: false
    } : {})
  }), [attendeeName, baseData, longContent, missingOptional, passType]);

  return (
    <div className="mt-6 grid gap-6">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-[-0.03em]">Scan First</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">A flat neo-brutalist pass with one job: make the QR fast to find and easy to scan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mobileWidth ? "primary" : "secondary"} onClick={() => setMobileWidth((value) => !value)}>
              {mobileWidth ? <Maximize2 className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              {mobileWidth ? "Full width" : "Mobile width"}
            </Button>
            <Button type="button" variant={longContent ? "primary" : "secondary"} onClick={() => setLongContent((value) => !value)}>Long copy</Button>
            <Button type="button" variant={missingOptional ? "primary" : "secondary"} onClick={() => setMissingOptional((value) => !value)}>Minimal data</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Attendee name
            <Input value={attendeeName} onChange={(event) => setAttendeeName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">Pass type
            <Input value={passType} onChange={(event) => setPassType(event.target.value)} />
          </label>
        </div>
      </GlassCard>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="grid min-h-[820px] place-items-start justify-items-center overflow-hidden bg-[#dcff3f] p-6 sm:p-10">
          <div className={`grid w-full place-items-center transition-[max-width] ${mobileWidth ? "max-w-[340px]" : "max-w-[512px]"}`}>
            <PassExperience data={previewData} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold tracking-[-0.025em]">What this design prioritizes</h2>
          <ul className="mt-5 grid gap-4 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">Large QR.</strong> The scan target owns the center of the pass.</li>
            <li><strong className="text-foreground">Fast identity check.</strong> Guest and event names remain large and separate.</li>
            <li><strong className="text-foreground">No gestures.</strong> Nothing flips, tilts, hides, or requests motion access.</li>
            <li><strong className="text-foreground">Practical fallbacks.</strong> The pass keeps a visible code and essential entry details.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
