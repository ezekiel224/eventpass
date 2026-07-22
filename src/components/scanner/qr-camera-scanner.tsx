"use client";

import { Camera, CheckCircle2, Loader2, ShieldAlert, StopCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type QrCameraScannerProps = {
  onScan: (decodedText: string) => boolean | void | Promise<boolean | void>;
  disabled?: boolean;
  startLabel?: string;
  stopLabel?: string;
};

type Html5Scanner = {
  start: (
    cameraIdOrConfig: string | { facingMode: string },
    configuration: { fps: number; qrbox: { width: number; height: number } },
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback?: () => void
  ) => Promise<unknown>;
  stop: () => Promise<unknown>;
  clear: () => void;
};

type Html5QrcodeClass = {
  new (elementId: string): Html5Scanner;
  getCameras: () => Promise<Array<{ id: string; label: string }>>;
};

export function QrCameraScanner({
  onScan,
  disabled = false,
  startLabel = "Scan pass",
  stopLabel = "Stop camera"
}: QrCameraScannerProps) {
  const generatedId = useId().replace(/:/g, "");
  const readerId = `qr-reader-${generatedId}`;
  const scannerRef = useRef<Html5Scanner | null>(null);
  const scanLockedRef = useRef(false);
  const lastScanRef = useRef({ value: "", at: 0 });
  const unlockTimerRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraId, setCameraId] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  function playFeedback(success: boolean) {
    if (!success) return;

    try {
      const AudioContextClass = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1174, context.currentTime + 0.09);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.17);
      oscillator.addEventListener("ended", () => void context.close());
    } catch {
      // Visual feedback remains available when audio is blocked by the browser.
    }
  }

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  async function stopCamera() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => undefined);
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    scanLockedRef.current = false;
    setFeedback(null);
    setIsActive(false);
    setIsStarting(false);
  }

  async function startCamera() {
    if (isActive || isStarting) {
      await stopCamera();
      return;
    }

    setError("");
    setIsStarting(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const Qrcode = Html5Qrcode as unknown as Html5QrcodeClass;
      const availableCameras = await Qrcode.getCameras();
      const preferredCamera = cameraId || availableCameras.find((camera) => /back|rear|environment/i.test(camera.label))?.id || availableCameras[0]?.id || "";
      setCameras(availableCameras);
      setCameraId(preferredCamera);

      const scanner = new Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        preferredCamera || { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 }
        },
        (decodedText: string) => {
          const now = Date.now();
          if (scanLockedRef.current || (lastScanRef.current.value === decodedText && now - lastScanRef.current.at < 2500)) {
            return;
          }
          scanLockedRef.current = true;
          lastScanRef.current = { value: decodedText, at: now };
          setFeedback(null);
          void Promise.resolve(onScan(decodedText))
            .then((result) => {
              const success = result !== false;
              setFeedback(success ? "success" : "error");
              playFeedback(success);
            })
            .catch(() => setFeedback("error"))
            .finally(() => {
              unlockTimerRef.current = window.setTimeout(() => {
                scanLockedRef.current = false;
                setFeedback(null);
              }, 900);
            });
        },
        () => undefined
      );

      setIsActive(true);
    } catch (startError) {
      const detail = startError instanceof Error ? startError.message : "Unknown camera error";
      setError(`Camera could not start. Allow camera access, use HTTPS or localhost, then try again. ${detail}`);
      await stopCamera();
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className={isActive || isStarting ? "relative min-h-72 overflow-hidden rounded-xl border border-border bg-muted" : "hidden"}>
        <div id={readerId} className="min-h-72 [&_video]:min-h-72 [&_video]:object-cover" />
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition ${feedback === "success" ? "bg-emerald-500/30 opacity-100" : feedback === "error" ? "bg-destructive/25 opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          <span className={`grid h-20 w-20 place-items-center rounded-full text-white shadow-2xl ${feedback === "error" ? "bg-destructive" : "bg-emerald-500"}`}>
            {feedback === "error" ? <ShieldAlert className="h-10 w-10" /> : <CheckCircle2 className="h-10 w-10" />}
          </span>
        </div>
      </div>
      {cameras.length > 1 ? (
        <select
          value={cameraId}
          onChange={(event) => setCameraId(event.target.value)}
          className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
          disabled={isActive || isStarting}
          aria-label="Camera"
        >
          {cameras.map((camera, index) => (
            <option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>
          ))}
        </select>
      ) : null}
      {error ? (
        <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void startCamera()} disabled={disabled || isStarting}>
          {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? <StopCircle className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {isStarting ? "Starting camera" : isActive ? stopLabel : startLabel}
        </Button>
      </div>
      {isActive ? <p className="text-xs text-muted-foreground">Camera stays active after each scan. Hold the next pass in view when feedback clears.</p> : null}
    </div>
  );
}
