"use client";

import { motion, useTransform } from "framer-motion";
import type { PassMotionControls } from "@/components/passes/pass-types";

export function PassDepth({ motion: passMotion, accent }: { motion: PassMotionControls; accent: string }) {
  const edgeX = useTransform(passMotion.x, [-1, 1], [-2.5, 2.5]);
  const edgeY = useTransform(passMotion.y, [-1, 1], [1, 4.5]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[0.5px] rounded-[1.7rem]"
      style={{
        x: edgeX,
        y: edgeY,
        translateZ: -5,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 68%, #ffffff), color-mix(in srgb, ${accent} 42%, #090909) 45%, #050505)`,
        boxShadow: `0 18px 34px color-mix(in srgb, ${accent} 13%, transparent), 0 28px 54px rgba(0,0,0,.34)`
      }}
    />
  );
}
