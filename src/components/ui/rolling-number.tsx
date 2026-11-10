"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./rolling-number.css";

export function RollingNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  const chars = value.toLocaleString().split("");

  return <span className={cn("ep-rolling-number", className)} aria-label={`${value.toLocaleString()}${suffix}`}>
    <span className="ep-rolling-number-track" aria-hidden="true">
      {chars.map((char, index) => {
        const place = chars.length - index;
        return <span className={char === "," ? "is-punctuation" : "is-digit"} key={`place-${place}`}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={`${place}-${char}`} initial={reduceMotion ? false : { y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduceMotion ? undefined : { y: 14, opacity: 0 }} transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}>{char}</motion.span>
          </AnimatePresence>
        </span>;
      })}
      {suffix ? <span className="is-suffix">{suffix}</span> : null}
    </span>
  </span>;
}
