"use client";

import Image from "next/image";
import { KeyboardEvent, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Diamond, QrCode, Rotate3D, Spade, Ticket } from "lucide-react";
import { CasinoRoulette } from "@/components/passes/CasinoRoulette";
import { PassDepth } from "@/components/passes/PassDepth";
import { PassSurfaceEffects } from "@/components/passes/PassSurfaceEffects";
import { fittedEventTitleSize, fittedGuestNameSize, raisedLetteringStyle } from "@/components/passes/pass-text";
import type { InteractivePassProps } from "@/components/passes/pass-types";

function CasinoQr({ guestName, qrValue, qrImageUrl }: Pick<InteractivePassProps, "guestName" | "qrValue" | "qrImageUrl">) {
  return (
    <div className="rounded-xl border border-[#d5ad59]/55 bg-[#f8f1df] p-2 text-[#090806] shadow-[0_6px_0_rgba(73,51,15,0.34),0_15px_25px_rgba(0,0,0,0.32)]" title={qrValue} style={{ transform: "translateZ(18px)" }}>
      {qrImageUrl ? (
        <Image src={qrImageUrl} width={96} height={96} alt={`QR code for ${guestName}`} unoptimized className="h-[5.2rem] w-[5.2rem] rounded-md sm:h-24 sm:w-24" />
      ) : (
        <div className="grid h-[5.2rem] w-[5.2rem] place-items-center sm:h-24 sm:w-24"><QrCode className="h-16 w-16" aria-hidden="true" /></div>
      )}
      <p className="mt-1 text-center text-[7px] font-black uppercase tracking-[0.16em]">House verified</p>
    </div>
  );
}

export function CasinoPass(props: InteractivePassProps) {
  const { motion: passMotion } = props;
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const currentFace = props.face ?? internalFace;
  const flipped = currentFace === "back";

  function toggleFace() {
    const nextFace = flipped ? "front" : "back";
    if (props.face === undefined) setInternalFace(nextFace);
    props.onFaceChange?.(nextFace);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFace();
    }
  }

  return (
    <div className="relative mx-auto aspect-[4/5.65] w-full max-w-[480px]" aria-label={`${props.eventName} casino pass for ${props.guestName}`}>
      <motion.div
        className="absolute inset-[1.2%]"
        style={{ rotateX: passMotion.rotateX, rotateY: passMotion.rotateY, transformPerspective: 1050, transformStyle: "preserve-3d" }}
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
          aria-label={`${flipped ? "Show front of" : "Show details on"} ${props.eventName} pass`}
        >
          <PassDepth motion={passMotion} accent="#d2a84d" />
          <section className="absolute inset-0 overflow-hidden rounded-[1.65rem] border border-[#cfa550]/25 bg-[radial-gradient(circle_at_74%_18%,rgba(113,86,31,0.28),transparent_25%),linear-gradient(145deg,#151513,#020202_58%,#11100d)] p-6 text-[#f8e5b0] shadow-[inset_0_1px_0_rgba(255,228,152,0.1)] [backface-visibility:hidden] sm:p-7" style={{ WebkitBackfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
            <PassSurfaceEffects accent="#d2a84d" />
            <Diamond className="pointer-events-none absolute -right-10 top-16 h-44 w-44 rotate-12 text-[#c89c42]/[0.06]" strokeWidth={1} aria-hidden="true" />

            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(30px)" }}>
              <header className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#caa24d]">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" /> High-roller reserve
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.19em] text-[#ead8aa]/50">Private gaming credential</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[#b78d3a]/50 bg-black/50">
                  <Spade className="h-5 w-5 fill-[#d6ad58] text-[#d6ad58]" aria-hidden="true" />
                </div>
              </header>

              <div className="mt-[4%] grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#ae8537] sm:text-[10px]">Tonight · {props.eventDate}</p>
                  <h1 className="mt-2.5 max-w-[15rem] text-balance font-black uppercase leading-[0.88] tracking-[-0.05em] text-[#f7e5b1]" style={{ fontSize: fittedEventTitleSize(props.eventName), ...raisedLetteringStyle("#d2a84d") }}>
                    {props.eventName}
                  </h1>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="h-px w-7 bg-[#cba24f]" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#d4b66f]/70">Tilt to play</span>
                  </div>
                </div>
                <CasinoRoulette motion={passMotion} />
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#a67f35]/60 bg-[#d2a84d]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]">
                    <Ticket className="h-3 w-3" aria-hidden="true" /> {props.ticketType}
                  </span>
                  <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.3em] text-[#ddc484]/45">Player</p>
                  <h2 className="mt-1 line-clamp-2 font-black uppercase leading-[0.95] tracking-[-0.03em] text-[#fff2cc]" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle("#d2a84d") }}>{props.guestName}</h2>
                  <p className="mt-2 truncate text-[10px] uppercase tracking-[0.17em] text-[#d9c99e]/55">{props.accessLevel ?? "VIP floor access"}</p>
                </div>
                <CasinoQr guestName={props.guestName} qrValue={props.qrValue} qrImageUrl={props.qrImageUrl} />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#9a762f]/30 pt-3 text-[8px] font-bold uppercase tracking-[0.2em] text-[#d5bd7b]/40">
                <span>{props.passId ?? "Members only"}</span>
                <span className="flex items-center gap-1.5"><Rotate3D className="h-3 w-3" aria-hidden="true" /> Tap to flip</span>
              </div>
            </div>
          </section>

          <section className="absolute inset-0 overflow-hidden rounded-[1.65rem] border border-[#cfa550]/25 bg-[radial-gradient(circle_at_74%_18%,rgba(113,86,31,0.28),transparent_25%),linear-gradient(145deg,#151513,#020202_58%,#11100d)] p-7 text-[#f8e5b0] shadow-[inset_0_1px_0_rgba(255,228,152,0.1)] [backface-visibility:hidden]" style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
            <PassSurfaceEffects accent="#d2a84d" />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(28px)" }}>
              <div className="flex items-center justify-between">
                <Crown className="h-6 w-6 text-[#d6ad58]" aria-hidden="true" />
                <span className="text-[9px] font-black uppercase tracking-[0.28em] text-[#d6ad58]">House privileges</span>
              </div>
              <div className="mt-[15%] text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#d6ad58]">Credential holder</p>
                <h2 className="mt-3 font-black uppercase leading-none tracking-[-0.04em] text-[#fff2cc]" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle("#d2a84d") }}>{props.guestName}</h2>
                {props.company ? <p className="mt-2 text-xs text-[#ead8aa]/75">{props.company}</p> : null}
              </div>
              <dl className="mt-8 grid grid-cols-2 gap-3 text-xs">
                {[
                  ["Access", props.accessLevel ?? props.ticketType],
                  ["Date", props.eventDate],
                  ["Time", props.eventTime ?? "Doors at seven"],
                  ["Room", props.venue ?? "Private salon"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#a67f35]/45 bg-black/30 p-3 shadow-[inset_0_1px_rgba(255,255,255,0.035)]">
                    <dt className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#d6ad58]">{label}</dt>
                    <dd className="mt-1.5 font-semibold text-[#fff2cc]">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex items-end justify-between gap-4">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#d6ad58]">Pass reference</p>
                  <p className="mt-1 font-mono text-xs text-[#fff2cc]">{props.passId ?? props.qrValue}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#d6ad58]"><Rotate3D className="h-3.5 w-3.5" /> Tap to return</span>
              </div>
            </div>
          </section>
        </motion.article>
      </motion.div>
    </div>
  );
}
