"use client";

import { motion, useTransform } from "framer-motion";
import type { PassMotionControls } from "@/components/passes/pass-types";

export function CasinoRoulette({ motion: passMotion }: { motion: PassMotionControls }) {
  const ballAngle = useTransform(
    [passMotion.x, passMotion.y],
    ([x, y]: number[]) => -90 - Math.max(-1, Math.min(1, y * 0.8 + x * 0.35)) * 82
  );
  const ballInset = useTransform(
    [passMotion.x, passMotion.y],
    ([x, y]: number[]) => 7 + Math.max(0, 1 - Math.min(1, Math.hypot(x, y))) * 3
  );

  return (
    <div className="relative -mr-6 h-[10.5rem] w-[5.55rem] overflow-hidden sm:-mr-7 sm:h-48 sm:w-24" aria-label="Tilt-controlled roulette wheel with green zero pocket" style={{ transform: "translateZ(20px)" }}>
      <div className="absolute left-0 top-1/2 aspect-square w-[10.5rem] -translate-y-1/2 rounded-full border border-[#e1bc66]/70 bg-[#080806] p-2 shadow-[0_16px_30px_rgba(0,0,0,0.48),inset_0_0_20px_rgba(219,174,75,0.12)] sm:w-48">
        <div className="absolute inset-1 rounded-full border border-[#73551f]" />
        <div className="relative h-full w-full rounded-full border-2 border-[#c99b43] bg-[repeating-conic-gradient(from_-5deg,#8f1715_0deg_10deg,#171613_10deg_20deg)] shadow-[inset_0_0_0_5px_#17130b,inset_0_0_18px_#000]">
          <div className="absolute inset-0 rounded-full bg-[#08783f] [clip-path:polygon(50%_50%,43%_0,57%_0)]" />
          <div className="absolute inset-[22%] rounded-full border border-[#d0a44e]/65 bg-[radial-gradient(circle,#d8ae55_0_8%,#211b0f_9%_34%,#a87f31_35%_40%,#090806_41%)]" />
          <span className="absolute left-1/2 top-0.5 -translate-x-1/2 rounded-sm bg-[#08783f] px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm">0</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black text-[#f5dfa6]">23</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-[#f5dfa6]">7</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-[#f5dfa6]">11</span>
        </div>
        <motion.div className="pointer-events-none absolute inset-0" style={{ rotate: ballAngle }}>
          <motion.span
            className="absolute left-1/2 block h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/80 bg-[radial-gradient(circle_at_35%_30%,#fff,#d9d6cb_45%,#777_100%)] shadow-[0_2px_7px_#000] sm:h-3 sm:w-3"
            style={{ top: ballInset }}
          />
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-y-3 right-0 w-px bg-gradient-to-b from-transparent via-[#e1bc66]/70 to-transparent" />
    </div>
  );
}
