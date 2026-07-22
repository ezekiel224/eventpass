"use client";

import Image from "next/image";
import { KeyboardEvent, useState } from "react";
import { motion } from "framer-motion";
import {
  Atom,
  BadgeCheck,
  Dna,
  Gamepad2,
  Orbit,
  QrCode,
  Rotate3D,
  ShieldCheck,
  Ticket,
  type LucideIcon
} from "lucide-react";
import { PassDepth } from "@/components/passes/PassDepth";
import { PassSurfaceEffects } from "@/components/passes/PassSurfaceEffects";
import type { InteractivePassProps, PassFinish, PassTheme } from "@/components/passes/pass-types";
import { fittedEventTitleSize, fittedGuestNameSize, raisedLetteringStyle } from "@/components/passes/pass-text";

type RemainingTheme = Exclude<PassTheme, "gala" | "casino">;

type ThemeConfig = {
  label: string;
  eyebrow: string;
  credentialLabel: string;
  accent: string;
  secondary: string;
  background: string;
  pattern: string;
  Icon: LucideIcon;
};

const themeConfig: Record<Exclude<RemainingTheme, "minimal">, ThemeConfig> = {
  "retro-arcade": {
    label: "Arcade protocol",
    eyebrow: "Player one / access ready",
    credentialLabel: "Game credential",
    accent: "#55fff0",
    secondary: "#f064ff",
    background: "linear-gradient(145deg,#170825 0%,#080310 58%,#160722 100%)",
    pattern: "linear-gradient(rgba(85,255,240,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(240,100,255,.06) 1px,transparent 1px)",
    Icon: Gamepad2
  },
  science: {
    label: "Research division",
    eyebrow: "Observation series / 024",
    credentialLabel: "Lab credential",
    accent: "#70e8ff",
    secondary: "#5fa8ff",
    background: "linear-gradient(145deg,#0a2330 0%,#031017 58%,#071e29 100%)",
    pattern: "linear-gradient(rgba(112,232,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(112,232,255,.05) 1px,transparent 1px)",
    Icon: Atom
  },
  biology: {
    label: "Living systems",
    eyebrow: "Field archive / specimen 07",
    credentialLabel: "Field credential",
    accent: "#7ae4a4",
    secondary: "#d9f77a",
    background: "linear-gradient(145deg,#0c291a 0%,#031008 60%,#102719 100%)",
    pattern: "radial-gradient(circle at 15% 20%,rgba(122,228,164,.13) 0 2px,transparent 3px),radial-gradient(circle at 80% 65%,rgba(217,247,122,.08) 0 4px,transparent 5px)",
    Icon: Dna
  },
  space: {
    label: "Deep-space mission",
    eyebrow: "Orbital authority / EP-24",
    credentialLabel: "Mission credential",
    accent: "#a99cff",
    secondary: "#73d9ff",
    background: "linear-gradient(145deg,#11132c 0%,#03040d 58%,#101127 100%)",
    pattern: "radial-gradient(circle at 18% 17%,rgba(255,255,255,.7) 0 1px,transparent 1.5px),radial-gradient(circle at 76% 34%,rgba(115,217,255,.6) 0 1px,transparent 1.5px),radial-gradient(circle at 43% 72%,rgba(255,255,255,.5) 0 1px,transparent 1.5px)",
    Icon: Orbit
  }
};

function getThemeConfig(theme: RemainingTheme, finish: PassFinish): ThemeConfig {
  if (theme !== "minimal") return themeConfig[theme];
  const light = finish === "light";
  return {
    label: light ? "Essential / White" : "Essential / Black",
    eyebrow: "Digital credential / series 001",
    credentialLabel: "Event credential",
    accent: light ? "#111111" : "#f4f4ef",
    secondary: light ? "#6b6b66" : "#a8a8a1",
    background: light
      ? "linear-gradient(145deg,#ffffff 0%,#e8e8e3 58%,#f8f8f5 100%)"
      : "linear-gradient(145deg,#191919 0%,#050505 58%,#121212 100%)",
    pattern: light
      ? "linear-gradient(rgba(0,0,0,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.035) 1px,transparent 1px)"
      : "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
    Icon: BadgeCheck
  };
}

function PassQr({ props, large = false }: { props: InteractivePassProps; large?: boolean }) {
  const size = large ? 128 : 96;
  return (
    <div className="shrink-0 rounded-2xl border border-black/10 bg-white p-2 text-black shadow-[0_7px_0_rgba(0,0,0,0.16),0_16px_30px_rgba(0,0,0,0.24)]" title={props.qrValue} style={{ transform: "translateZ(18px)" }}>
      {props.qrImageUrl ? (
        <Image src={props.qrImageUrl} width={size} height={size} alt={`QR code for ${props.guestName}`} unoptimized className={large ? "h-32 w-32 rounded-lg" : "h-[5.3rem] w-[5.3rem] rounded-lg sm:h-24 sm:w-24"} />
      ) : (
        <div className={`grid place-items-center ${large ? "h-32 w-32" : "h-[5.3rem] w-[5.3rem] sm:h-24 sm:w-24"}`}><QrCode className={large ? "h-28 w-28" : "h-16 w-16"} aria-hidden="true" /></div>
      )}
      <p className="mt-1 text-center text-[7px] font-black uppercase tracking-[0.18em]">Scan to verify</p>
    </div>
  );
}

export interface ThemedPassProps extends InteractivePassProps {
  theme: RemainingTheme;
  finish?: PassFinish;
}

export function ThemedPass({ theme, finish = "dark", ...props }: ThemedPassProps) {
  const config = getThemeConfig(theme, finish);
  const light = theme === "minimal" && finish === "light";
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const currentFace = props.face ?? internalFace;
  const flipped = currentFace === "back";
  const Icon = config.Icon;

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

  const faceStyle = {
    color: light ? "#111111" : "#f8fafc",
    backgroundImage: `${config.pattern},${config.background}`,
    backgroundSize: theme === "biology" || theme === "space" ? "100% 100%" : "30px 30px,30px 30px,100% 100%",
    borderColor: `${config.accent}33`
  };

  return (
    <div className="relative mx-auto aspect-[4/5.65] w-full max-w-[480px]" aria-label={`${config.label} pass for ${props.guestName}`}>
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
          aria-label={`${flipped ? "Show front of" : "Show details on"} ${config.label} pass`}
        >
          <PassDepth motion={props.motion} accent={config.accent} />
          <section className="absolute inset-0 overflow-hidden rounded-[1.65rem] border p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_30px_75px_rgba(0,0,0,0.4)] [backface-visibility:hidden] sm:p-7" style={{ ...faceStyle, WebkitBackfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
            <PassSurfaceEffects accent={config.accent} light={light} />
            <Icon className="pointer-events-none absolute -right-12 top-24 h-56 w-56 opacity-[0.055]" strokeWidth={1} aria-hidden="true" />

            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(30px)" }}>
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: config.accent }}>{config.eyebrow}</p>
                  <p className={`mt-2 text-[10px] uppercase tracking-[0.18em] ${light ? "text-black/45" : "text-white/45"}`}>{config.credentialLabel}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl border" style={{ color: config.accent, borderColor: `${config.accent}66`, backgroundColor: `${config.accent}12` }}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </header>

              <div className="mt-[9%]">
                <div className="mb-4 h-px w-12" style={{ background: `linear-gradient(90deg,${config.accent},transparent)` }} />
                <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${light ? "text-black/40" : "text-white/40"}`}>{props.eventDate}</p>
                <h1 className="mt-3 max-w-[20rem] text-balance font-black leading-[0.87] tracking-[-0.055em]" style={{ fontSize: fittedEventTitleSize(props.eventName), ...raisedLetteringStyle(config.accent, light) }}>{props.eventName}</h1>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: config.secondary }}>{props.venue ?? "Digital admission"}</p>
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: config.accent, borderColor: `${config.accent}66`, backgroundColor: `${config.accent}12` }}>
                    <Ticket className="h-3 w-3" aria-hidden="true" /> {props.ticketType}
                  </span>
                  <p className={`mt-4 text-[8px] font-bold uppercase tracking-[0.28em] ${light ? "text-black/40" : "text-white/40"}`}>Credential holder</p>
                  <h2 className="mt-1 line-clamp-2 font-black leading-[0.96] tracking-[-0.03em]" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle(config.accent, light) }}>{props.guestName}</h2>
                  {props.company ? <p className={`mt-1 truncate text-xs ${light ? "text-black/45" : "text-white/45"}`}>{props.company}</p> : null}
                </div>
                <PassQr props={props} />
              </div>

              <div className={`mt-5 flex items-center justify-between border-t pt-3 text-[8px] font-bold uppercase tracking-[0.19em] ${light ? "border-black/10 text-black/40" : "border-white/10 text-white/40"}`}>
                <span>{props.passId ?? "Authenticated pass"}</span>
                <span className="flex items-center gap-1.5"><Rotate3D className="h-3 w-3" aria-hidden="true" /> Tap to flip</span>
              </div>
            </div>
          </section>

          <section className="absolute inset-0 overflow-hidden rounded-[1.65rem] border p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_30px_75px_rgba(0,0,0,0.4)] [backface-visibility:hidden]" style={{ ...faceStyle, WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
            <PassSurfaceEffects accent={config.accent} light={light} />
            <Icon className="pointer-events-none absolute -left-12 bottom-12 h-56 w-56 opacity-[0.045]" strokeWidth={1} aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col" style={{ transform: "translateZ(28px)" }}>
              <header className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em]" style={{ color: config.accent }}><ShieldCheck className="h-4 w-4" /> Verified credential</span>
                <Icon className="h-5 w-5" style={{ color: config.accent }} aria-hidden="true" />
              </header>

              <div className="mt-[7%] grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="min-w-0">
                  <p className={`text-[8px] font-bold uppercase tracking-[0.28em] ${light ? "text-black/40" : "text-white/40"}`}>Admitted guest</p>
                  <h2 className="mt-2 break-words font-black leading-none tracking-[-0.04em]" style={{ fontSize: fittedGuestNameSize(props.guestName), ...raisedLetteringStyle(config.accent, light) }}>{props.guestName}</h2>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: config.secondary }}>{props.accessLevel ?? props.ticketType}</p>
                </div>
                <PassQr props={props} large />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Event", props.eventName],
                  ["Date", props.eventDate],
                  ["Time", props.eventTime ?? "See event schedule"],
                  ["Venue", props.venue ?? "See event details"]
                ].map(([label, value]) => (
                  <div key={label} className={`rounded-xl border p-3 ${light ? "border-black/10 bg-black/[0.035]" : "border-white/10 bg-white/[0.045]"}`}>
                    <dt className={`text-[8px] font-bold uppercase tracking-[0.2em] ${light ? "text-black/40" : "text-white/40"}`}>{label}</dt>
                    <dd className="mt-1.5 line-clamp-2 font-semibold leading-4">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className={`mt-auto flex items-end justify-between gap-4 border-t pt-4 ${light ? "border-black/10" : "border-white/10"}`}>
                <div className="min-w-0">
                  <p className={`text-[8px] font-bold uppercase tracking-[0.24em] ${light ? "text-black/40" : "text-white/40"}`}>Pass reference</p>
                  <p className="mt-1 truncate font-mono text-xs" style={{ color: config.accent }}>{props.passId ?? props.qrValue}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.17em] ${light ? "text-black/40" : "text-white/40"}`}><Rotate3D className="h-3.5 w-3.5" /> Tap to return</span>
              </div>
            </div>
          </section>
        </motion.article>
      </motion.div>
    </div>
  );
}
