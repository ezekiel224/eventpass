"use client";

import Image from "next/image";
import { KeyboardEvent, useId, useState } from "react";
import { motion, useTransform } from "framer-motion";
import { QrCode, Rotate3D, ShieldCheck, Ticket } from "lucide-react";
import { PassDepth } from "@/components/passes/PassDepth";
import { PassLocationMap } from "@/components/passes/PassLocationMap";
import type { InteractivePassProps } from "@/components/passes/pass-types";
import styles from "@/components/passes/GalaPass.module.css";

function galaEventTitleSize(value: string) {
  if (value.length > 58) return "clamp(1.8rem, 7.6vw, 3rem)";
  if (value.length > 36) return "clamp(2.15rem, 9.2vw, 3.65rem)";
  return "clamp(2.75rem, 12vw, 4.45rem)";
}

function galaGuestNameSize(value: string) {
  if (value.length > 34) return "clamp(1.2rem, 5vw, 1.7rem)";
  if (value.length > 24) return "clamp(1.4rem, 5.8vw, 2rem)";
  return "clamp(1.7rem, 7.2vw, 2.5rem)";
}

function GalaOrnament() {
  const foilPatternId = useId().replaceAll(":", "");

  return (
    <svg className={styles.ornament} viewBox="0 0 320 452" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={foilPatternId} width="1" height="1" patternContentUnits="objectBoundingBox">
          <image href="/textures/gala-gold-foil.jpg" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
        </pattern>
      </defs>
      <g stroke={`url(#${foilPatternId})`}>
        <path d="M18 102V18h84M218 18h84v84M302 350v84h-84M102 434H18v-84" />
        <path d="M34 88V34h54M232 34h54v54M286 364v54h-54M88 418H34v-54" />
        <path d="M160 12l14 14-14 14-14-14zM160 412l14 14-14 14-14-14z" />
      </g>
    </svg>
  );
}

function GalaQr({ props, large = false }: { props: InteractivePassProps; large?: boolean }) {
  const size = large ? 124 : 112;
  return (
    <div
      className="shrink-0 rounded-2xl border border-white/35 bg-white/95 p-2 text-black shadow-[0_7px_0_rgba(96,70,18,0.28),0_16px_28px_rgba(0,0,0,0.24)]"
      title={props.qrValue}
      style={{ transform: "translateZ(18px)" }}
    >
      {props.qrImageUrl ? (
        <Image src={props.qrImageUrl} width={size} height={size} alt={`QR code for ${props.guestName}`} unoptimized className={large ? "h-[7.75rem] w-[7.75rem] rounded-lg" : "h-28 w-28 rounded-lg"} />
      ) : (
        <div className={`grid place-items-center ${large ? "h-[7.75rem] w-[7.75rem]" : "h-28 w-28"}`}><QrCode className={large ? "h-28 w-28" : "h-20 w-20"} aria-hidden="true" /></div>
      )}
      <p className="mt-1 text-center text-[7px] font-bold uppercase tracking-[0.16em]">Scan to verify</p>
    </div>
  );
}

export function GalaPass(props: InteractivePassProps) {
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const currentFace = props.face ?? internalFace;
  const flipped = currentFace === "back";
  const foilX = useTransform(props.motion.x, [-1, 1], ["18%", "82%"]);
  const foilY = useTransform(props.motion.y, [-1, 1], ["18%", "82%"]);

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

  const faceClass = `absolute inset-0 overflow-hidden p-6 text-[#f2eadb] [backface-visibility:hidden] sm:p-7 ${styles.face}`;
  const foilPosition = { backgroundPositionX: foilX, backgroundPositionY: foilY };

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
            <GalaOrnament />

              <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(30px)" }}>
              <header className="flex items-start justify-between gap-4">
                <div>
                  <motion.div className={`text-[11px] font-bold uppercase tracking-[0.28em] ${styles.foilText}`} style={foilPosition}>Black-tie series</motion.div>
                  <p className="mt-2 text-[13px] font-medium uppercase tracking-[0.16em] text-[#f2eadb]/55">An evening of distinction</p>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-full text-sm font-serif font-bold ${styles.foilBadge}`} style={{ transform: "translateZ(14px)" }}>
                  EP
                </div>
              </header>

              <div className="mt-[6%]">
                <div className="mb-3 h-px w-14 bg-gradient-to-r from-[#f4d47e] to-transparent" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d8bd7a]/70">Private invitation</p>
                <motion.h1 className={`mt-2.5 max-w-[22rem] text-balance font-serif font-semibold leading-[0.86] tracking-[-0.05em] ${styles.foilText}`} style={{ fontSize: galaEventTitleSize(props.eventName), transform: "translateZ(12px)", ...foilPosition }}>{props.eventName}</motion.h1>
                <p className="mt-3 max-w-[19rem] text-xs font-medium uppercase leading-5 tracking-[0.18em] text-[#f7dda1]">{props.eventDate}{props.eventTime ? ` · ${props.eventTime}` : ""}</p>
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4">
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${styles.foilBadge}`}>
                    <Ticket className="h-3 w-3" aria-hidden="true" /> {props.ticketType}
                  </span>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d8bd7a]/60">Presented to</p>
                  <motion.h2 className={`mt-1 line-clamp-2 font-serif font-semibold leading-[0.96] ${styles.foilText}`} style={{ fontSize: galaGuestNameSize(props.guestName), transform: "translateZ(12px)", ...foilPosition }}>{props.guestName}</motion.h2>
                  {props.company ? <p className="mt-1 truncate text-[13px] text-[#f2eadb]/55">{props.company}</p> : null}
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[#f2eadb]/45">
                    {props.venue ? <span>{props.venue}</span> : null}
                    {props.accessLevel ? <span>{props.accessLevel}</span> : null}
                  </div>
                  {props.address ? <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-white/45">{props.address}</p> : null}
                </div>
                <GalaQr props={props} />
              </div>

              <div className="mt-3 flex justify-end text-[9px] font-bold uppercase tracking-[0.17em] text-white/40"><span className="flex items-center gap-1.5"><Rotate3D className="h-3 w-3" /> Tap to flip</span></div>
            </div>
          </section>

          <section className={faceClass} style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
            <GalaOrnament />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(28px)" }}>
              <header className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-[#f7dda1]"><ShieldCheck className="h-4 w-4" /> Invitation verified</span>
                <span className={`grid h-8 w-8 place-items-center rounded-full text-[9px] font-serif font-bold ${styles.foilBadge}`}>EP</span>
              </header>
              <div className="mt-[8%] grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-[#d8bd7a]/60">Honored guest</p>
                  <motion.h2 className={`mt-2 break-words font-serif font-semibold leading-none ${styles.foilText}`} style={{ fontSize: galaGuestNameSize(props.guestName), transform: "translateZ(12px)", ...foilPosition }}>{props.guestName}</motion.h2>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e5c476]">{props.accessLevel ?? props.ticketType}</p>
                </div>
                <GalaQr props={props} large />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                {[["Event", props.eventName], ["Date", props.eventDate], ["Time", props.eventTime ?? "See invitation"], ["Venue", props.venue ?? "See event details"]].map(([label, value]) => (
                  <div key={label} className={`rounded-xl border p-3 ${styles.detailPanel}`}>
                    <dt className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#d8bd7a]/55">{label}</dt>
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
