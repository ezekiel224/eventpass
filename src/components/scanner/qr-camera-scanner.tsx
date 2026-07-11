"use client";

import { Camera, Loader2, ShieldAlert, StopCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type QrCameraScannerProps = {
  onScan: (decodedText: string) => void | Promise<void>;
  disabled?: boolean;
  startLabel?: string;
  stopLabel?: string;
};

type Html5Scanner = {
  start: (
    cameraIdOrConfig: string | { facingMode: string },
    configuration: { fps: number; qrbox: { width: number; height: number }; aspectRatio?: number },
    qrCodeSuccessCallback: (decodedText: string) => void,
    qrCodeErrorCallback?: () => void
  ) => Promise<unknown>;
  stop: () => Promise<unknown>;
  clear: () => void;
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
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
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
      const scanner = new Html5Qrcode(readerId) as unknown as Html5Scanner;
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1
        },
        (decodedText: string) => {
          if (scanLockedRef.current) {
            return;
          }
          scanLockedRef.current = true;
          void stopCamera();
          void onScan(decodedText);
        },
        () => undefined
      );

      setIsActive(true);
    } catch {
      setError("Camera could not start. Allow camera access, use HTTPS or localhost, then try again.");
      await stopCamera();
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div
        id={readerId}
        className={isActive || isStarting ? "min-h-72 overflow-hidden rounded-xl border border-border bg-muted [&_video]:min-h-72 [&_video]:object-cover" : "hidden"}
      />
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
    </div>
  );
}
