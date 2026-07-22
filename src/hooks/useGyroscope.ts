"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export type GyroscopePermission = "checking" | "prompt" | "granted" | "denied" | "unavailable";

export type GyroscopeReading = {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
};

type PermissionAwareOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function useGyroscope(enabled = true) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 115, damping: 24, mass: 0.55 });
  const y = useSpring(rawY, { stiffness: 115, damping: 24, mass: 0.55 });
  const [permission, setPermission] = useState<GyroscopePermission>("checking");
  const [isActive, setIsActive] = useState(false);
  const [reading, setReading] = useState<GyroscopeReading>({ alpha: null, beta: null, gamma: null });
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);
  const hasReceivedReading = useRef(false);
  const listening = useRef(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    const { alpha, beta, gamma } = event;
    if (beta === null || gamma === null) return;

    if (!baseline.current) baseline.current = { beta, gamma };
    const screenAngle = typeof screen !== "undefined" && screen.orientation
      ? screen.orientation.angle
      : typeof window !== "undefined"
        ? window.orientation ?? 0
        : 0;
    const betaDelta = beta - baseline.current.beta;
    const gammaDelta = gamma - baseline.current.gamma;
    const landscape = Math.abs(screenAngle) === 90;

    rawX.set(clamp((landscape ? betaDelta : gammaDelta) / 32));
    rawY.set(clamp((landscape ? -gammaDelta : betaDelta) / 38));
    setReading({ alpha, beta, gamma });

    if (!hasReceivedReading.current) {
      hasReceivedReading.current = true;
      setIsActive(true);
      setPermission("granted");
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    }
  }, [rawX, rawY]);

  const startListening = useCallback(() => {
    if (listening.current || typeof window === "undefined") return;
    listening.current = true;
    window.addEventListener("deviceorientation", onOrientation, true);
    fallbackTimer.current = setTimeout(() => {
      if (!hasReceivedReading.current) {
        setPermission("unavailable");
        setIsActive(false);
      }
    }, 1600);
  }, [onOrientation]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setPermission("unavailable");
      return false;
    }

    const OrientationEvent = DeviceOrientationEvent as PermissionAwareOrientationEvent;
    try {
      const result = OrientationEvent.requestPermission
        ? await OrientationEvent.requestPermission()
        : "granted";
      if (result !== "granted") {
        setPermission("denied");
        setIsActive(false);
        return false;
      }
      baseline.current = null;
      setPermission("granted");
      startListening();
      return true;
    } catch {
      setPermission("denied");
      setIsActive(false);
      return false;
    }
  }, [startListening]);

  const recalibrate = useCallback(() => {
    baseline.current = null;
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  useEffect(() => {
    const setupTimer = window.setTimeout(() => {
      if (!enabled) {
        setPermission("unavailable");
        return;
      }
      if (!("DeviceOrientationEvent" in window)) {
        setPermission("unavailable");
        return;
      }

      const OrientationEvent = DeviceOrientationEvent as PermissionAwareOrientationEvent;
      if (typeof OrientationEvent.requestPermission === "function") {
        setPermission("prompt");
      } else {
        setPermission("granted");
        startListening();
      }
    }, 0);

    return () => {
      window.clearTimeout(setupTimer);
      window.removeEventListener("deviceorientation", onOrientation, true);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      listening.current = false;
    };
  }, [enabled, onOrientation, startListening]);

  return { x, y, reading, permission, isActive, requestPermission, recalibrate };
}
