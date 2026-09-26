"use client";

import { ArrowLeft, CheckCircle2, Clock3, QrCode, ShieldAlert, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { initials } from "@/lib/utils";
import type { CheckInResult } from "@/types/domain";

function ageAlertCopy(result: CheckInResult) {
  if (result.attendee.under21 && result.attendee.plusOneUnder21) {
    return `${result.attendee.firstName} and ${result.attendee.plusOneName ?? "their guest"} are under 21.`;
  }
  if (result.attendee.under21) return `${result.attendee.firstName}, the primary attendee, is under 21.`;
  return `${result.attendee.plusOneName ?? "The guest"} is under 21.`;
}

function playAgeAlert() {
  try {
    navigator.vibrate?.([260, 120, 260, 120, 420]);
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.72);
    gain.connect(context.destination);
    [0, 0.24, 0.48].forEach((offset) => {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(620, context.currentTime + offset);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.15);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // The persistent visual warning remains when audio or vibration is unavailable.
  }
}

export function MobilePassScanner({ initialResult = null }: { initialResult?: CheckInResult | null }) {
  const [result, setResult] = useState<CheckInResult | null>(initialResult);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState(initialResult ? 1 : 0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    return () => {
      void wakeLockRef.current?.release().catch(() => undefined);
    };
  }, []);

  async function setScannerActive(active: boolean) {
    setScanning(active);
    if (!active) {
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock?.request("screen") ?? null;
    } catch {
      // Scanning still works when the browser does not support a screen wake lock.
    }
  }

  async function scanPass(qrPayload: string) {
    setMessage("");
    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrPayload })
    });
    const data = await response.json();

    if (!response.ok) {
      setResult(null);
      setMessage(typeof data.error === "string" ? data.error : "This pass could not be validated.");
      navigator.vibrate?.([180, 80, 180]);
      return false;
    }

    const nextResult = data as CheckInResult;
    setResult(nextResult);
    setScanCount((current) => current + 1);
    if (nextResult.under21Alert) playAgeAlert();
    return true;
  }

  const ageAlert = Boolean(result?.under21Alert);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-screen min-w-0 max-w-[100vw] flex-col sm:w-full sm:max-w-xl">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4">
          <Link href="/dashboard/check-in" className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card" aria-label="Back to check-in desk"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Pass scanner</p>
            <p className="truncate text-xs text-muted-foreground">Continuous mobile check-in</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className={`h-2 w-2 rounded-full ${scanning ? "bg-primary" : "bg-muted-foreground"}`} />{scanning ? "Scanning" : "Ready"}</span>
        </header>

        <section className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className="min-w-0 overflow-hidden rounded-[14px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Rear camera</p></div>
              <p className="text-xs tabular-nums text-muted-foreground">{scanCount} scanned</p>
            </div>
            <div className="p-3">
              <QrCameraScanner
                onScan={scanPass}
                onActiveChange={(active) => void setScannerActive(active)}
                startLabel="Start continuous scanner"
                stopLabel="Stop scanning"
                previewClassName="min-h-[52dvh] rounded-[12px] [&_video]:min-h-[52dvh]"
                actionClassName="min-h-12 w-full"
              />
            </div>
          </div>

          {message ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-destructive" role="alert">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" />
              <div><p className="font-black uppercase tracking-[0.08em]">Pass not accepted</p><p className="mt-1 text-sm font-medium">{message}</p></div>
            </div>
          ) : null}

          {result ? (
            <section className={`min-w-0 overflow-hidden rounded-2xl border p-4 ${ageAlert || result.duplicate ? "border-destructive/60 bg-destructive/10" : "border-primary/35 bg-card"}`} aria-live="assertive">
              {ageAlert ? (
                <div className="mb-4 flex items-start gap-3 border-b border-destructive/30 pb-4 text-destructive" role="alert">
                  <ShieldAlert className="mt-0.5 h-7 w-7 shrink-0" />
                  <div className="min-w-0"><p className="text-lg font-black uppercase tracking-[0.06em]">Age check required</p><p className="mt-1 text-sm font-bold">{ageAlertCopy(result)}</p><p className="mt-2 text-xs font-medium">Verify identification and apply the venue&apos;s age policy before admitting this party.</p></div>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl font-bold ${ageAlert || result.duplicate ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>{initials(result.attendee.name)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{result.attendee.name}</p><p className="truncate text-sm text-muted-foreground">{result.attendee.eventName} · {result.attendee.ticketTier}</p></div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-bold"><Users className="h-3.5 w-3.5" />{result.attendee.plusOneEnabled ? 2 : 1}</span>
              </div>
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${result.duplicate ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                {result.duplicate ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {result.duplicate ? "Already checked in · duplicate logged" : "Checked in"}
                <span className="ml-auto inline-flex items-center gap-1 tabular-nums"><Clock3 className="h-3.5 w-3.5" />{new Date(result.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center">
              <QrCode className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-3 text-sm font-semibold">Ready for the first pass</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">The camera remains active and accepts the next pass as soon as feedback clears.</p>
            </div>
          )}

          <Link href="/dashboard/check-in" className="focus-ring mb-2 text-center text-sm font-semibold text-muted-foreground hover:text-foreground">Use manual check-in instead</Link>
        </section>
      </div>
    </main>
  );
}
