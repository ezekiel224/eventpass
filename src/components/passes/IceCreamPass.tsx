"use client";

import Image from "next/image";
import { KeyboardEvent, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent } from "framer-motion";
import { IceCreamCone, QrCode, Rotate3D } from "lucide-react";
import { PassDepth } from "@/components/passes/PassDepth";
import { PassLocationMap } from "@/components/passes/PassLocationMap";
import type { InteractivePassProps } from "@/components/passes/pass-types";
import styles from "@/components/passes/IceCreamPass.module.css";

const accent = "#b92161";
const teal = "#176f69";
const sprinkleColors = ["#b92161", "#176f69", "#e79b2f", "#6e4ba8", "#e45d48"];

type Sprinkle = {
  id: number;
  color: string;
  left: number;
  drift: number;
  rotate: number;
  duration: number;
};

function IceCreamSprinkles({ props }: { props: InteractivePassProps }) {
  const [sprinkles, setSprinkles] = useState<Sprinkle[]>([]);
  const lastMotion = useRef({ x: props.motion.x.get(), y: props.motion.y.get() });
  const lastDropAt = useRef(0);
  const nextId = useRef(0);

  function dropFromMotion(axis: "x" | "y", latest: number) {
    if (props.motion.reducedMotion) return;

    const previous = lastMotion.current[axis];
    lastMotion.current[axis] = latest;
    const movement = Math.abs(latest - previous);
    const now = performance.now();

    if (movement < 0.035 || now - lastDropAt.current < 180) return;
    lastDropAt.current = now;

    const count = movement > 0.13 ? 2 : 1;
    const additions = Array.from({ length: count }, (_, index): Sprinkle => ({
      id: nextId.current++,
      color: sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)],
      // The QR code occupies the lower-right corner on both pass faces.
      left: 8 + Math.random() * 48,
      drift: latest * 38 + (Math.random() - 0.5) * 20,
      rotate: (Math.random() > 0.5 ? 1 : -1) * (160 + Math.random() * 220),
      duration: 1.35 + Math.random() * 0.55 + index * 0.08
    }));

    setSprinkles((current) => [...current.slice(-6), ...additions]);
  }

  useMotionValueEvent(props.motion.x, "change", (latest) => dropFromMotion("x", latest));
  useMotionValueEvent(props.motion.y, "change", (latest) => dropFromMotion("y", latest));

  return (
    <div className={styles.sprinkleField} aria-hidden="true">
      <AnimatePresence>
        {sprinkles.map((sprinkle) => (
          <motion.span
            key={sprinkle.id}
            className={styles.sprinkle}
            style={{ left: `${sprinkle.left}%`, backgroundColor: sprinkle.color }}
            initial={{ y: -18, x: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: 760,
              x: sprinkle.drift,
              rotate: sprinkle.rotate,
              opacity: [0, 0.95, 0.95, 0]
            }}
            transition={{ duration: sprinkle.duration, ease: [0.22, 0.61, 0.36, 1], times: [0, 0.08, 0.76, 1] }}
            onAnimationComplete={() => setSprinkles((current) => current.filter(({ id }) => id !== sprinkle.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function IceCreamQr({ props }: { props: InteractivePassProps }) {
  return (
    <div className={`${styles.qr} shrink-0 p-1.5`} title={props.qrValue}>
      {props.qrImageUrl ? (
        <Image src={props.qrImageUrl} width={92} height={92} alt={`QR code for ${props.guestName}`} unoptimized className="h-[76px] w-[76px]" />
      ) : (
        <div className="grid h-[76px] w-[76px] place-items-center"><QrCode className="h-16 w-16" aria-hidden="true" /></div>
      )}
      <p className="mt-1 text-center text-[6px] font-black uppercase tracking-[.12em]">Scan to verify</p>
    </div>
  );
}

export function IceCreamPass(props: InteractivePassProps) {
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const currentFace = props.face ?? internalFace;
  const flipped = currentFace === "back";

  function toggleFace() {
    const nextFace = flipped ? "front" : "back";
    if (props.face === undefined) setInternalFace(nextFace);
    props.onFaceChange?.(nextFace);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleFace();
  }

  const facts = [
    ["Serving", props.ticketType],
    ["Guest", props.guestName],
    ["Access", props.accessLevel ?? props.ticketType],
    ["Date", props.eventDate],
    ["Time", props.eventTime ?? "See event schedule"],
    ["Venue", props.venue ?? "See event details"],
    ["Address", props.address ?? "Provided by organizer"],
    ["Company", props.company ?? "Independent guest"]
  ];

  return (
    <div className="relative mx-auto aspect-[4/5.65] w-full max-w-[480px]" aria-label={`Insight Pints pass for ${props.guestName}`}>
      <motion.div
        className="absolute inset-[1.2%]"
        style={{ rotateX: props.motion.rotateX, rotateY: props.motion.rotateY, transformPerspective: 1050, transformStyle: "preserve-3d" }}
      >
        <motion.article
          className="relative z-10 h-full w-full cursor-pointer outline-none [will-change:transform]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 145, damping: 19, mass: .8 }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={toggleFace}
          onKeyDown={onKeyDown}
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={`${flipped ? "Show front of" : "Show details on"} Insight Pints pass`}
        >
          <PassDepth motion={props.motion} accent={accent} />

          <section className={`${styles.face} absolute inset-0 overflow-hidden p-7 pt-14 text-[#171411] [backface-visibility:hidden] sm:p-8 sm:pt-16`} style={{ WebkitBackfaceVisibility: "hidden", transform: "translateZ(.5px)" }}>
            <div className={styles.lid} aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 top-44 z-[2] h-56 w-56 rounded-full bg-[#f5acc8]/45" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 z-[2] h-44 w-44 rounded-full bg-[#9bded4]/55" aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(28px)" }}>
              <p className="text-[9px] font-black uppercase tracking-[.31em]" style={{ color: teal }}>A thoughtfully churned gathering</p>
              <h1 className={`${styles.brand} mt-[10%]`}>Insight<br /><span className={styles.brandAccent} style={{ color: accent }}>Pints</span></h1>
              <div className="mt-7 h-2 w-20 bg-[#171411]" />
              <p className="mt-4 text-[9px] font-black uppercase tracking-[.26em]" style={{ color: teal }}>Today&apos;s featured flavor</p>
              <h2 className={`${styles.eventName} mt-2`}>{props.eventName}</h2>
              <p className="mt-3 max-w-[18rem] text-[10px] font-bold uppercase leading-4 tracking-[.14em]">{props.eventDate}{props.eventTime ? ` · ${props.eventTime}` : ""}</p>

              <div className="mt-auto flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <span className={`${styles.flavorSeal} inline-flex items-center gap-1.5 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em]`} style={{ color: accent }}>
                    <IceCreamCone className="h-3.5 w-3.5" /> {props.ticketType}
                  </span>
                  <p className="mt-4 text-[8px] font-black uppercase tracking-[.25em] opacity-50">Hand-packed for</p>
                  <p className="mt-1 line-clamp-2 text-xl font-black leading-none tracking-[-.04em]">{props.guestName}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <IceCreamQr props={props} />
                  <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] opacity-50"><Rotate3D className="h-3 w-3" /> Flip for facts</span>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.face} absolute inset-0 overflow-hidden p-5 pt-12 text-[#111] [backface-visibility:hidden] sm:p-6 sm:pt-14`} style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(.5px)" }}>
            <div className={styles.lid} aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(27px)" }}>
              <div className={`${styles.label} flex min-h-0 flex-1 flex-col p-3 sm:p-4`}>
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[clamp(2rem,9vw,3rem)] font-black leading-[.78] tracking-[-.07em]">Pass Facts</h2>
                    <p className="mt-2 text-[8px] font-bold uppercase tracking-[.16em]">Insight Pints · one admission per serving</p>
                  </div>
                  <IceCreamCone className="h-8 w-8 shrink-0" strokeWidth={2.7} aria-hidden="true" />
                </header>

                <div className={`${styles.ruleHeavy} mt-2 pt-1 text-[8px] font-bold`}>Amount per event</div>
                <div className="flex items-end justify-between gap-3 py-1">
                  <span className="text-base font-black">Admitted Guest</span>
                  <strong className="max-w-[55%] truncate text-right text-base">{props.guestName}</strong>
                </div>
                <div className={`${styles.ruleMedium} pb-1 pt-1 text-right text-[7px] font-black uppercase`}>% memorable evening</div>

                <dl className="text-[9px] leading-3">
                  {facts.map(([label, value]) => (
                    <div className={styles.row} key={label}>
                      <dt className="font-bold">{label}</dt>
                      <dd className={styles.value} title={value}>{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className={`${styles.ruleHeavy} mt-1 grid grid-cols-[1fr_auto] items-center gap-3 pt-2`}>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[.14em]">Authenticated pass</p>
                    <p className="mt-1 truncate font-mono text-[9px]">{props.passId ?? props.qrValue}</p>
                    <p className="mt-2 text-[7px] font-bold leading-[1.35]">Ingredients: good people, bright ideas, shared moments, and one verified event credential.</p>
                  </div>
                  <IceCreamQr props={props} />
                </div>
              </div>

              {props.showMap !== false ? (
                <div className="mt-2 overflow-hidden rounded-xl border-2 border-black bg-white/80"><PassLocationMap address={props.address} venue={props.venue} variant="light" accent={teal} /></div>
              ) : null}

              <div className="mt-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.14em]">
                <span>{props.eventName}</span>
                <span className="flex items-center gap-1"><Rotate3D className="h-3 w-3" /> Tap to return</span>
              </div>
            </div>
          </section>
        </motion.article>
        <IceCreamSprinkles props={props} />
      </motion.div>
    </div>
  );
}
