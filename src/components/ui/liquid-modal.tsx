"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => undefined;

const widths = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl"
} as const;

export function LiquidModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: keyof typeof widths;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xl dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
          />
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn("liquid-modal relative flex max-h-[min(92dvh,62rem)] w-full flex-col overflow-hidden outline-none", widths[size])}
            initial={{ opacity: 0, y: 34, scale: 0.94, filter: "blur(18px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.97, filter: "blur(10px)" }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="relative z-10 flex shrink-0 items-start justify-between gap-5 border-b border-white/15 px-5 py-5 dark:border-white/10 sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="panel-label text-primary">Editor</p>
                <h2 id={titleId} className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{title}</h2>
                {description ? <p id={descriptionId} className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
              </div>
              <button type="button" className="liquid-icon-button focus-ring" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></button>
            </header>
            <div className="liquid-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">{children}</div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
