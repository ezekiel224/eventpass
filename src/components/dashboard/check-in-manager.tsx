"use client";

import { CheckCircle2, QrCode, RotateCcw, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import { Card, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";
import { AttendeeSummary, CheckInResult } from "@/types/domain";

type CheckInLog = {
  id: string;
  duplicate: boolean;
  scannedAt: string;
  attendee: AttendeeSummary;
};

export function CheckInManager() {
  const [attendees, setAttendees] = useState<AttendeeSummary[]>([]);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [attendeeId, setAttendeeId] = useState("");
  const [fallbackCode, setFallbackCode] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [attendeeResponse, logResponse] = await Promise.all([
      fetch("/api/attendees", { cache: "no-store" }),
      fetch("/api/check-in", { cache: "no-store" })
    ]);
    const attendeeData = await attendeeResponse.json();
    const logData = await logResponse.json();
    setAttendees(attendeeData.attendees ?? []);
    setLogs(logData.checkIns ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/check-in/stream");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as { checkIns?: CheckInLog[] };
      setLogs(data.checkIns ?? []);
    };
    return () => source.close();
  }, []);

  async function submitCheckIn(overrides?: { attendeeId?: string; fallbackCode?: string; qrPayload?: string }) {
    setMessage("");
    setResult(null);
    const nextAttendeeId = overrides?.attendeeId ?? attendeeId;
    const nextFallbackCode = overrides?.fallbackCode ?? fallbackCode;
    const nextQrPayload = overrides?.qrPayload ?? qrPayload;

    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: nextAttendeeId || undefined,
        fallbackCode: nextFallbackCode || undefined,
        qrPayload: nextQrPayload || undefined
      })
    });
    const data = await response.json();

    if (response.ok) {
      setResult(data);
      setAttendeeId("");
      setFallbackCode("");
      setQrPayload("");
      setLogs((current) => [{
        id: `${data.attendee.id}:${data.checkedInAt}`,
        duplicate: data.duplicate,
        scannedAt: data.checkedInAt,
        attendee: data.attendee
      }, ...current].slice(0, 20));
      return true;
    } else {
      setMessage(data.error ?? "Could not validate this pass.");
      return false;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitCheckIn();
  }

  async function submitScannedPayload(decodedText: string) {
    setQrPayload(decodedText);
    return submitCheckIn({ qrPayload: decodedText });
  }

  const displayAttendee = result?.attendee ?? attendees.find((attendee) => attendee.id === attendeeId) ?? attendees[0];

  return (
    <>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pass scanner</h2>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <QrCameraScanner onScan={submitScannedPayload} startLabel="Scan pass" stopLabel="Stop camera" />
            <select
              value={attendeeId}
              onChange={(event) => setAttendeeId(event.target.value)}
              className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Choose attendee</option>
              {attendees.map((attendee) => (
                <option key={attendee.id} value={attendee.id}>{attendee.name} - {attendee.eventName}</option>
              ))}
            </select>
            <Input value={fallbackCode} onChange={(event) => setFallbackCode(event.target.value)} placeholder="Or enter fallback code, e.g. EP-MAYA" />
            <textarea
              value={qrPayload}
              onChange={(event) => setQrPayload(event.target.value)}
              placeholder="Or paste QR payload JSON from an attendee pass"
              className="focus-ring min-h-28 rounded-xl border border-border bg-background p-3 text-sm"
            />
            {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
            <div className="flex gap-2">
              <Button type="submit"><CheckCircle2 className="h-4 w-4" /> Check In</Button>
              <Button type="button" variant="secondary" onClick={() => { setAttendeeId(""); setFallbackCode(""); setQrPayload(""); setResult(null); setMessage(""); }}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Signed QR validation", "Duplicate scan log", "Persistent check-ins"].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-card p-3 text-sm">{item}</div>
            ))}
          </div>
        </GlassCard>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Latest scan</h2>
          {displayAttendee ? (
            <div className="mt-5 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{initials(displayAttendee.name)}</span>
                <div>
                  <p className="text-lg font-semibold">{displayAttendee.name}</p>
                  <p className="text-sm text-muted-foreground">{displayAttendee.email}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Ticket type</p>
                  <p className="font-semibold">{displayAttendee.ticketTier}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Fallback code</p>
                  <p className="font-semibold">{displayAttendee.fallbackCode}</p>
                </div>
              </div>
              {(displayAttendee.selectedAllergens.length > 0 || displayAttendee.plusOneAllergens.length > 0) ? (
                <div className="mt-3 rounded-xl bg-muted p-3 text-sm">
                  {displayAttendee.selectedAllergens.length > 0 ? <p>Allergens: {displayAttendee.selectedAllergens.join(", ")}</p> : null}
                  {displayAttendee.plusOneAllergens.length > 0 ? <p>Plus-one allergens: {displayAttendee.plusOneAllergens.join(", ")}</p> : null}
                </div>
              ) : null}
              {displayAttendee.plusOneName ? (
                <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm text-primary">
                  Plus-one: {displayAttendee.plusOneName}
                </div>
              ) : null}
              {(result?.under21Alert || displayAttendee.under21 || displayAttendee.plusOneUnder21) ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                  {result?.under21Message ?? (displayAttendee.under21 && displayAttendee.plusOneUnder21
                    ? "Attendee and plus-one self-identified as under 21."
                    : displayAttendee.under21
                      ? "Attendee self-identified as under 21."
                      : "Plus-one self-identified as under 21.")}
                </div>
              ) : null}
              {result ? (
                <div className={result.duplicate ? "mt-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" : "mt-5 flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent"}>
                  {result.duplicate ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {result.duplicate ? "Already checked in. Duplicate scan logged." : `Valid pass. Checked in at ${new Date(result.checkedInAt).toLocaleTimeString()}.`}
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary">
                  <QrCode className="h-4 w-4" />
                  Select or enter a pass to validate.
                </div>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Add an attendee before checking anyone in.</p>
          )}
          <h3 className="mt-6 font-semibold">Recent check-ins</h3>
          <div className="mt-3 space-y-2">
            {logs.length === 0 ? <p className="text-sm text-muted-foreground">No scans yet.</p> : null}
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span>{log.attendee.name}{log.attendee.under21 || log.attendee.plusOneUnder21 ? " - Under 21 alert" : ""}</span>
                <span className={log.duplicate ? "text-destructive" : "text-accent"}>{log.duplicate ? "Duplicate" : "Checked in"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
