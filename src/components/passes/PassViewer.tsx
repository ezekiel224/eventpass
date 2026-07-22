"use client";

import { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Rotate3D, ShieldCheck } from "lucide-react";
import { CasinoPass } from "@/components/passes/CasinoPass";
import { GalaPass } from "@/components/passes/GalaPass";
import { ThemedPass } from "@/components/passes/ThemedPass";
import type { EventPassDetails, PassFace, PassFinish, PassMotionControls, PassTheme } from "@/components/passes/pass-types";
import { useGyroscope } from "@/hooks/useGyroscope";

export interface PassViewerProps extends EventPassDetails {
  theme: PassTheme;
  className?: string;
  forceReducedMotion?: boolean;
  finish?: PassFinish;
  face?: PassFace;
  onFaceChange?: (face: PassFace) => void;
  staticPreview?: boolean;
}

export function PassViewer({
  theme,
  className = "",
  forceReducedMotion = false,
  finish = "dark",
  face,
  onFaceChange,
  staticPreview = false,
  ...details
}: PassViewerProps) {
  const gyro = useGyroscope(!staticPreview);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 140, damping: 24, mass: 0.45 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 140, damping: 24, mass: 0.45 });
  const systemReducedMotion = useReducedMotion() ?? false;
  const reduceMotion = forceReducedMotion || systemReducedMotion;
  const [dragging, setDragging] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const bounds = useRef<DOMRect | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);
  const tiltX = gyro.isActive && !reduceMotion ? gyro.x : smoothPointerX;
  const tiltY = gyro.isActive && !reduceMotion ? gyro.y : smoothPointerY;
  const rotateX = useTransform(tiltY, [-1, 1], [9, -9]);
  const rotateY = useTransform(tiltX, [-1, 1], [-11, 11]);
  const motionControls: PassMotionControls = {
    x: tiltX,
    y: tiltY,
    rotateX,
    rotateY,
    reducedMotion: reduceMotion
  };

  function setFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = bounds.current ?? event.currentTarget.getBoundingClientRect();
    bounds.current = rect;
    pointerX.set(Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2)));
    pointerY.set(Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2)));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (gyro.isActive || reduceMotion) return;
    bounds.current = event.currentTarget.getBoundingClientRect();
    pointerStart.current = { x: event.clientX, y: event.clientY };
    didDrag.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (gyro.isActive || reduceMotion) return;
    if (dragging && pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 6) {
      didDrag.current = true;
    }
    if (event.pointerType === "mouse" || dragging) setFromPointer(event);
  }

  function resetPointer(event?: ReactPointerEvent<HTMLDivElement>) {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    bounds.current = null;
    pointerStart.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }

  function suppressFlipAfterDrag(event: ReactMouseEvent<HTMLDivElement>) {
    if (!didDrag.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDrag.current = false;
  }

  return (
    <div className={`relative isolate w-full ${className}`}>
      <div
        className="relative mx-auto w-full max-w-[500px] select-none touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={resetPointer}
        onPointerCancel={resetPointer}
        onPointerLeave={(event) => { if (event.pointerType === "mouse" && !dragging) resetPointer(); }}
        onClickCapture={suppressFlipAfterDrag}
        onDoubleClick={() => gyro.recalibrate()}
      >
        {theme === "gala" ? (
          <GalaPass {...details} motion={motionControls} face={face} onFaceChange={onFaceChange} />
        ) : theme === "casino" ? (
          <CasinoPass {...details} motion={motionControls} face={face} onFaceChange={onFaceChange} />
        ) : (
          <ThemedPass {...details} theme={theme} finish={finish} motion={motionControls} face={face} onFaceChange={onFaceChange} />
        )}
      </div>

      <span className="sr-only" aria-live="polite">{reduceMotion ? "Motion reduced" : gyro.isActive ? "Live phone tilt active" : dragging ? "Touch control active" : "Pointer control active"}</span>

      <AnimatePresence>
        {!staticPreview && gyro.permission === "prompt" && !promptDismissed && !reduceMotion ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-sm rounded-2xl border border-white/15 bg-[#11120f]/90 p-4 text-white shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4ad58]/30 bg-[#d4ad58]/10">
                <Rotate3D className="h-5 w-5 text-[#eccd82]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">Bring the pass to life</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Allow motion access to control the 3D pass with your phone. Orientation readings stay on this device.</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d4ad58] px-4 text-xs font-bold text-[#17130a] transition hover:bg-[#efd17e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#efd17e]"
                onClick={() => void gyro.requestPermission()}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Enable phone tilt
              </button>
              <button
                type="button"
                className="h-10 rounded-xl px-3 text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-white"
                onClick={() => setPromptDismissed(true)}
              >
                Not now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
