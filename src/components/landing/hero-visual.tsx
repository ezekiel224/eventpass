"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Mail, QrCode, Sparkles, TicketCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/card";

export function HeroVisual({ organizationName }: { organizationName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="relative min-h-[440px]"
    >
      <GlassCard className="absolute left-4 top-8 w-[78%] overflow-hidden p-4 sm:left-10">
        <div className="rounded-xl border border-primary/20 bg-primary p-5 text-primary-foreground shadow-glow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase text-primary-foreground/70">Aurora Summit</p>
              <h3 className="mt-2 text-2xl font-semibold">Maya Chen</h3>
              <p className="mt-1 text-sm text-primary-foreground/75">VIP Pass - Pier 27</p>
            </div>
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="mt-8 grid grid-cols-[1fr_auto] gap-5">
            <div className="space-y-2 text-sm text-primary-foreground/75">
              <p>Aug 18, 2026</p>
              <p>9:00 AM - 4:00 PM</p>
              <p>{organizationName}</p>
            </div>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.75 }}
              className="grid h-28 w-28 grid-cols-5 gap-1 rounded-xl bg-white p-3"
            >
              {Array.from({ length: 25 }).map((_, index) => (
                <span
                  key={index}
                  className={index % 2 === 0 || [6, 8, 16, 18].includes(index) ? "rounded-sm bg-slate-950" : "rounded-sm bg-white"}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </GlassCard>

      {[
        { icon: Mail, label: "Pass delivered", value: "98.7%", className: "right-2 top-0" },
        { icon: TicketCheck, label: "Checked in", value: "522", className: "bottom-24 left-0" },
        { icon: QrCode, label: "Scan time", value: "0.8s", className: "bottom-6 right-8" }
      ].map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 + index * 0.12 }}
          className={`glass absolute rounded-2xl p-4 ${item.className}`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold">{item.value}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.62 }}
        className="absolute bottom-0 right-0 w-72 rounded-2xl border border-border/80 bg-card/78 p-4 shadow-soft backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Valid pass</p>
            <p className="text-xs text-muted-foreground">Maya Chen checked in at 9:42 AM</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
