"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

type AnimatedSectionProps = HTMLMotionProps<"section">;

export function AnimatedSection({ children, className = "", ...props }: AnimatedSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.55 }}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  );
}
