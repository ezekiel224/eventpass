"use client";

import Image from "next/image";
import { KeyboardEvent, useState } from "react";
import { motion } from "framer-motion";
import { QrCode, Rotate3D, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { PassDepth } from "@/components/passes/PassDepth";
import { PassLocationMap } from "@/components/passes/PassLocationMap";
import { PassSurfaceEffects } from "@/components/passes/PassSurfaceEffects";
import { fittedEventTitleSize, fittedGuestNameSize, raisedLetteringStyle } from "@/components/passes/pass-text";
import type { InteractivePassProps } from "@/components/passes/pass-types";

function GalaQr({ props, large = false }: { props: InteractivePassProps; large?: boolean }) {
  const size = large ? 124 : 96;
  return (
    <div
      className="shrink-0 rounded-2xl border border-white/35 bg-white/95 p-2 text-black shadow-[0_7px_0_rgba(96,70,18,0.28),0_16px_28px_rgba(0,0,0,0.24)]"
      title={props.qrValue}
      style={{ transform: "translateZ(18px)" }}
    >
      {props.qrImageUrl ? (
        <Image src={props.qrImageUrl} width={size} height={size} alt={`QR code for ${props.guestName}`} unoptimized className={large ? "h-[7.75rem] w-[7.75rem] rounded-lg" : "h-[5.3rem] w-[5.3rem] rounded-lg sm:h-24 sm:w-24"} />
      ) : (
        <div className={`grid place-items-center ${large ? "h-[7.75rem] w-[7.75rem]" : "h-[5.3rem] w-[5.3rem] sm:h-24 sm:w-24"}`}><QrCode className={large ? "h-28 w-28" : "h-16 w-16"} aria-hidden="true" /></div>
      )}
      <p className="mt-1 text-center text-[7px] font-bold uppercase tracking-[0.16em]">Scan to verify</p>
    </div>
  );
}

export function GalaPass(props: InteractivePassProps) {
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

  const faceClass = "absolute inset-0 overflow-hidden rounded-[1.65rem] border border-white/20 bg-[linear-gradient(145deg,rgba(170,185,191,0.82),rgba(62,73,79,0.9)_45%,rgba(12,18,22,0.96))] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-[10px] [backface-visibility:hidden] sm:p-7";

  return (
    <div className="relative mx-auto aspect-[4/5.65] w-full max-w-[480px]" aria-label={`${props.eventName} gala pass for ${props.guestName}`}>
      <motion.div
        className="absolute inset-[1.2%]"
        style={{ rotateX: props.motion.rotateX, rotateY: props.motion.rotateY, transformPerspective: 1050, transformStyle: "preserve-3d" }}
      >
        <motion.article
          className="relative z-10 h-full w-full cursor-pointer outline-none [will-change:transform]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 145, damping: 19, mass: 0.8 }}
          style={{ transformStyle: "preserve-3d" }}
          onClick={toggleFace}
          onKeyDown={onKeyDown}
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={`${flipped ? "Show front of" : "Show details on"} ${props.eventName} gala pass`}
        >
          <PassDepth motion={props.motion} accent="#e5c476" />
          <section className={faceClass} style={{ WebkitBackfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
            <PassSurfaceEffects accent="#e5c476" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[#e7bd64]/10 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(30px)" }}>
              <header className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f9dfa2]">
                    <Sparkles className="h-3.5 w-3.5 drop-shadow" aria-hidden="true" /> Black-tie series
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-white/60">An evening of distinction</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[#f6d786]/45 bg-black/20 shadow-[0_4px_0_rgba(0,0,0,0.18)]" style={{ transform: "translateZ(14px)" }}>
                  <Sparkles className="h-5 w-5 text-[#f4d37e]" aria-hidden="true" />
                </div>
              </header>

              <div className="mt-[9%]">
                <div className="mb-4 h-px w-12 bg-gradient-to-r from-[#f4d47e] to-transparent" />
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/55">Private invitation</p>
                <h1 className="mt-3 max-w-[20rem] text-balance font-serif leading-[0.86] tracking-[-0.05em]" style={{ fontSize: fittedEventTitleSize(props.eventName), ...raisedLetteringStyle("#e5c476") }}>{props.eventName}</h1>
                <p className="mt-4 max-w-[17rem] text-[11px] uppercase leading-5 tracking-[0.2em] text-[#f7dda1]">{props.eventDate}{props.eventTime ? ` · ${props.eventTime}` : ""}</p>
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e9c56d]/40 bg-[#c29335]/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#ffe6a8] shadow-[0_3px_0_rgba(0,0,0,0.16)]">
                    <Ticket className="h-3 w-3" aria-hidden="true" /> {props.ticketType}
                  </span>
                  <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.28em] text-white/45">Presented to</p>
                  <h2 className="mt-1 line-clamp-2 font-serif leading-[0.98] text-white" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle("#e5c476") }}>{props.guestName}</h2>
                  {props.company ? <p className="mt-1 truncate text-xs text-white/55">{props.company}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.16em] text-white/45">
                    {props.venue ? <span>{props.venue}</span> : null}
                    {props.accessLevel ? <span>{props.accessLevel}</span> : null}
                  </div>
                  {props.address ? <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-white/45">{props.address}</p> : null}
                </div>
                <GalaQr props={props} />
              </div>

              <div className="mt-4 flex justify-end text-[8px] font-bold uppercase tracking-[0.18em] text-white/40"><span className="flex items-center gap-1.5"><Rotate3D className="h-3 w-3" /> Tap to flip</span></div>
            </div>
          </section>

          <section className={faceClass} style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
            <PassSurfaceEffects accent="#e5c476" />
            <Sparkles className="pointer-events-none absolute -left-16 bottom-8 h-64 w-64 text-[#e5c476]/[0.05]" strokeWidth={0.8} aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(28px)" }}>
              <header className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-[#f7dda1]"><ShieldCheck className="h-4 w-4" /> Invitation verified</span>
                <Sparkles className="h-5 w-5 text-[#e5c476]" aria-hidden="true" />
              </header>
              <div className="mt-[8%] grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-white/40">Honored guest</p>
                  <h2 className="mt-2 break-words font-serif leading-none" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle("#e5c476") }}>{props.guestName}</h2>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e5c476]">{props.accessLevel ?? props.ticketType}</p>
                </div>
                <GalaQr props={props} large />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                {[["Event", props.eventName], ["Date", props.eventDate], ["Time", props.eventTime ?? "See invitation"], ["Venue", props.venue ?? "See event details"]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/10 p-3 shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
                    <dt className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</dt>
                    <dd className="mt-1.5 line-clamp-2 font-medium leading-4">{value}</dd>
                  </div>
                ))}
              </dl>
              {props.showMap !== false ? <div className="mt-3"><PassLocationMap address={props.address} venue={props.venue} variant="gala" accent="#e5c476" /></div> : props.address ? <p className="mt-3 line-clamp-2 text-[9px] text-white/50">{props.address}</p> : null}
              <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                <div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-[0.23em] text-white/40">Invitation number</p><p className="mt-1 truncate font-mono text-xs text-[#f7dda1]">{props.passId ?? props.qrValue}</p></div>
                <span className="flex shrink-0 items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.17em] text-white/40"><Rotate3D className="h-3.5 w-3.5" /> Tap to return</span>
              </div>
            </div>
          </section>
        </motion.article>
      </motion.div>
    </div>
  );
}
