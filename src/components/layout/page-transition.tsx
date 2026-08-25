"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.main
      className={cn("page-stage", className)}
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
  );
}
