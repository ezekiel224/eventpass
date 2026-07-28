"use client";

import { Camera, CheckCircle2, Loader2, Minus, Plus, ShieldAlert, StopCircle } from "lucide-react";
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
    configuration: {
      fps: number;
      qrbox: { width: number; height: number };
      videoConstraints?: MediaTrackConstraints;
    },
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback?: () => void
  ) => Promise<unknown>;
  stop: () => Promise<unknown>;
  clear: () => void;
  getRunningTrackCapabilities: () => MediaTrackCapabilities & { zoom?: ZoomRange };
  getRunningTrackSettings: () => MediaTrackSettings & { zoom?: number };
  applyVideoConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
};

type ZoomRange = {
  min: number;
  max: number;
  step: number;
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
  const capabilityTimersRef = useRef<number[]>([]);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraId, setCameraId] = useState("");
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomChecked, setZoomChecked] = useState(false);

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
      capabilityTimersRef.current.forEach((timer) => window.clearTimeout(timer));
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
    capabilityTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    capabilityTimersRef.current = [];
    setZoomRange(null);
    setZoomChecked(false);
    pinchRef.current = null;
    setIsActive(false);
    setIsStarting(false);
  }

  async function startCamera(requestedCameraId?: string) {
    if (scannerRef.current || isStarting) {
      await stopCamera();
      return;
    }

    setError("");
    setIsStarting(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const Qrcode = Html5Qrcode as unknown as Html5QrcodeClass;
      const availableCameras = await Qrcode.getCameras();
      const preferredCamera = requestedCameraId || cameraId || availableCameras.find((camera) => /back|rear|environment/i.test(camera.label))?.id || availableCameras[0]?.id || "";
      setCameras(availableCameras);
      setCameraId(preferredCamera);

      const scanner = new Qrcode(readerId);
      scannerRef.current = scanner;
      const supportedConstraints = navigator.mediaDevices.getSupportedConstraints() as MediaTrackSupportedConstraints & { zoom?: boolean };
      const videoConstraints = {
        ...(preferredCamera
          ? { deviceId: { exact: preferredCamera } }
          : { facingMode: { ideal: "environment" } }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        ...(supportedConstraints.zoom ? { zoom: true } : {})
      } as MediaTrackConstraints;

      await scanner.start(
        preferredCamera || { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          videoConstraints
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

      function detectZoom() {
        if (scannerRef.current !== scanner) return;
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          const settings = scanner.getRunningTrackSettings();
          if (capabilities.zoom && capabilities.zoom.max > capabilities.zoom.min) {
            setZoomRange({
              min: capabilities.zoom.min,
              max: capabilities.zoom.max,
              step: capabilities.zoom.step || 0.1
            });
            setZoom(settings.zoom ?? capabilities.zoom.min);
            setZoomChecked(true);
            capabilityTimersRef.current.forEach((timer) => window.clearTimeout(timer));
            capabilityTimersRef.current = [];
            return;
          }
        } catch {
          // The stream may not have published its capabilities yet.
        }
      }

      detectZoom();
      capabilityTimersRef.current = [250, 750, 1500].map((delay, index, delays) => window.setTimeout(() => {
        detectZoom();
        if (index === delays.length - 1 && scannerRef.current === scanner) setZoomChecked(true);
      }, delay));
      setIsActive(true);
    } catch (startError) {
      const detail = startError instanceof Error ? startError.message : "Unknown camera error";
      setError(`Camera could not start. Allow camera access, use HTTPS or localhost, then try again. ${detail}`);
      await stopCamera();
    } finally {
      setIsStarting(false);
    }
  }

  async function selectCamera(nextCameraId: string) {
    setCameraId(nextCameraId);
    if (!isActive) return;
    await stopCamera();
    await startCamera(nextCameraId);
  }

  async function setCameraZoom(nextZoom: number) {
    if (!scannerRef.current || !zoomRange) return;
    const clamped = Math.min(zoomRange.max, Math.max(zoomRange.min, nextZoom));
    const stepped = Math.round((clamped - zoomRange.min) / zoomRange.step) * zoomRange.step + zoomRange.min;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ zoom: stepped } as MediaTrackConstraintSet]
      });
      setZoom(stepped);
    } catch {
      // Ignore a constraint rejected while a camera is switching or stopping.
    }
  }

  function cameraName(camera: { label: string }, index: number) {
    const label = camera.label.trim();
    if (!label) return `Camera ${index + 1}`;
    const direction = /front|user|facetime/i.test(label) ? "Front" : /back|rear|environment/i.test(label) ? "Rear" : "";
    const lens = /ultra.?wide|0[.,]5x/i.test(label)
      ? "ultra-wide"
      : /telephoto|tele|[235]x/i.test(label)
        ? "telephoto"
        : /wide/i.test(label)
          ? "wide"
          : "";
    const friendly = [direction, lens].filter(Boolean).join(" ");
    return friendly ? `${friendly[0].toUpperCase()}${friendly.slice(1)} — ${label}` : label;
  }

  function pinchDistance(touches: React.TouchList) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }

  return (
    <div className="grid gap-3">
      <div
        className={isActive || isStarting ? "relative min-h-72 touch-none overflow-hidden rounded-xl border border-border bg-muted" : "hidden"}
        onTouchStart={(event) => {
          if (event.touches.length === 2 && zoomRange) {
            pinchRef.current = { distance: pinchDistance(event.touches), zoom };
          }
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 2 || !pinchRef.current || !zoomRange) return;
          event.preventDefault();
          const scale = pinchDistance(event.touches) / pinchRef.current.distance;
          void setCameraZoom(pinchRef.current.zoom * scale);
        }}
        onTouchEnd={() => { pinchRef.current = null; }}
      >
        <div id={readerId} className="min-h-72 [&_video]:min-h-72 [&_video]:object-cover" />
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition ${feedback === "success" ? "bg-emerald-500/30 opacity-100" : feedback === "error" ? "bg-destructive/25 opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          <span className={`grid h-20 w-20 place-items-center rounded-full text-white shadow-2xl ${feedback === "error" ? "bg-destructive" : "bg-emerald-500"}`}>
            {feedback === "error" ? <ShieldAlert className="h-10 w-10" /> : <CheckCircle2 className="h-10 w-10" />}
          </span>
        </div>
        {zoomRange ? (
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-background/90 p-2 shadow-lg backdrop-blur">
            <Button type="button" variant="ghost" className="h-9 w-9 shrink-0 p-0" onClick={() => void setCameraZoom(zoom - zoomRange.step)} aria-label="Zoom out">
              <Minus className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoom}
              onChange={(event) => void setCameraZoom(Number(event.target.value))}
              className="min-w-0 flex-1 accent-primary"
              aria-label="Camera zoom"
            />
            <span className="w-11 text-center text-xs font-semibold">{zoom.toFixed(1)}×</span>
            <Button type="button" variant="ghost" className="h-9 w-9 shrink-0 p-0" onClick={() => void setCameraZoom(zoom + zoomRange.step)} aria-label="Zoom in">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
      {cameras.length > 1 ? (
        <label className="grid gap-1.5 text-sm font-medium">
          Camera lens
          <select
            value={cameraId}
            onChange={(event) => void selectCamera(event.target.value)}
            className="focus-ring h-11 rounded-xl border border-border bg-background px-3 text-sm"
            disabled={isStarting}
          >
            {cameras.map((camera, index) => (
              <option key={camera.id} value={camera.id}>{cameraName(camera, index)}</option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted-foreground">Choose front, rear, wide, or telephoto when your phone exposes those lenses.</span>
        </label>
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
      {isActive ? <p className="text-xs text-muted-foreground">Camera stays active after each scan. Hold the next pass in view when feedback clears.{zoomRange ? " Pinch the preview or use the zoom controls." : ""}</p> : null}
      {isActive && zoomChecked && !zoomRange ? (
        <p className="text-xs text-muted-foreground">This browser did not expose zoom for the selected lens. Try another rear lens from the Camera lens menu or open this page in Chrome.</p>
      ) : null}
    </div>
  );
}
