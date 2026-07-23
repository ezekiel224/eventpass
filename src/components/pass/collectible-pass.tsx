"use client";

import Image from "next/image";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Rotate3D } from "lucide-react";
import { PassThemeArt } from "@/components/pass/pass-theme-art";
import {
  GenericVariant,
  NormalizedPassData,
  PassFace,
  PassThemeId,
  passThemeRegistry,
  safePassAsset,
  safePassColor
} from "@/components/pass/pass-system";
import styles from "@/components/pass/collectible-pass.module.css";

type PassStyle = CSSProperties & {
  "--pass-accent": string;
  "--pass-secondary": string;
  "--pass-tilt-strength": string;
  "--pass-motion-scale": string;
};

type CollectiblePassProps = {
  data: NormalizedPassData;
  theme?: PassThemeId;
  genericVariant?: GenericVariant;
  face?: PassFace;
  initialFace?: PassFace;
  onFaceChange?: (face: PassFace) => void;
  forceReducedMotion?: boolean;
  animationIntensity?: number;
  compact?: boolean;
  className?: string;
};

const themeClasses: Record<PassThemeId, string> = {
  casino: styles.themeCasino,
  gala: styles.themeGala,
  "ice-cream": styles.themeMinimal,
  "retro-arcade": styles.themeArcade,
  science: styles.themeScience,
  biology: styles.themeBiology,
  space: styles.themeSpace,
  minimal: styles.themeMinimal
};

const themeLabels: Record<PassThemeId, { passId: string; access: string; raffle: string; venue: string }> = {
  casino: { passId: "House credential", access: "Room access", raffle: "Lucky chips", venue: "Private room" },
  gala: { passId: "Invitation no.", access: "Admission", raffle: "Drawing entries", venue: "Reception" },
  "ice-cream": { passId: "Scoop pass", access: "Social access", raffle: "Treat tickets", venue: "Parlor" },
  "retro-arcade": { passId: "Player ID", access: "Unlocked zone", raffle: "Tokens", venue: "Stage" },
  science: { passId: "Credential ID", access: "Authorization", raffle: "Trial entries", venue: "Lab sector" },
  biology: { passId: "Specimen ID", access: "Field access", raffle: "Samples", venue: "Habitat" },
  space: { passId: "Mission ID", access: "Clearance", raffle: "Credits", venue: "Destination" },
  minimal: { passId: "Pass ID", access: "Access", raffle: "Raffle tickets", venue: "Venue" }
};

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, summary, [data-no-flip]"));
}

function PassQr({ data }: { data: NormalizedPassData }) {
  return (
    <div className={styles.qrPanel} data-no-flip>
      <div className={styles.qrFrame}>
        {data.qrDataUrl ? (
          <Image src={data.qrDataUrl} alt={`Verification QR code for ${data.attendeeName}`} width={142} height={142} unoptimized priority />
        ) : (
          <span className={styles.qrUnavailable}>QR unavailable</span>
        )}
      </div>
      <span>SCAN TO VERIFY</span>
    </div>
  );
}

function OrganizerMark({ data }: { data: NormalizedPassData }) {
  const logo = safePassAsset(data.organizerLogo);
  return (
    <div className={styles.organizerMark}>
      {logo ? <Image src={logo} alt="" width={28} height={28} unoptimized /> : <span aria-hidden="true">✦</span>}
      <b>{data.organizerName}</b>
    </div>
  );
}

function FlipControl({ face, onFlip }: { face: PassFace; onFlip: () => void }) {
  return (
    <button type="button" className={styles.flipControl} onClick={(event) => { event.stopPropagation(); onFlip(); }}>
      <Rotate3D aria-hidden="true" />
      {face === "front" ? "Tap to reveal details" : "Return to pass"}
    </button>
  );
}

function PassMetadata({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === "") return null;
  return <div className={styles.metadataItem}><span>{label}</span><strong>{value}</strong></div>;
}

export function CollectiblePass({
  data,
  theme = "minimal",
  genericVariant = "dark",
  face,
  initialFace = "front",
  onFaceChange,
  forceReducedMotion = false,
  animationIntensity = 1,
  compact = false,
  className = ""
}: CollectiblePassProps) {
  const [internalFace, setInternalFace] = useState<PassFace>(initialFace);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const currentFace = face ?? internalFace;
  const flipped = currentFace === "back";
  const labels = themeLabels[theme];
  const themeDefinition = passThemeRegistry[theme];
  const intensity = Math.max(0, Math.min(1, animationIntensity));
  const attendeePhoto = safePassAsset(data.attendeePhoto);
  const sponsorLogos = data.sponsorLogos.flatMap((sponsor) => {
    const url = safePassAsset(sponsor.url);
    return url ? [{ ...sponsor, url }] : [];
  });

  const passStyle = useMemo<PassStyle>(() => ({
    "--pass-accent": safePassColor(data.accentColor, "#14f1cc"),
    "--pass-secondary": safePassColor(data.secondaryColor, "#7c3aed"),
    "--pass-tilt-strength": String(8 * intensity),
    "--pass-motion-scale": String(intensity)
  }), [data.accentColor, data.secondaryColor, intensity]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    if (!flipped) return;
    const tilt = tiltRef.current;
    if (!tilt) return;
    tilt.style.setProperty("--pass-rotate-x", "0deg");
    tilt.style.setProperty("--pass-rotate-y", "0deg");
  }, [flipped]);

  function changeFace(nextFace: PassFace) {
    if (face === undefined) setInternalFace(nextFace);
    onFaceChange?.(nextFace);
  }

  function toggleFace() {
    changeFace(flipped ? "front" : "back");
  }

  function applyPendingPointer() {
    frameRef.current = null;
    const tilt = tiltRef.current;
    const bounds = boundsRef.current;
    const pointer = pendingPointerRef.current;
    if (!tilt || !bounds || !pointer || flipped || forceReducedMotion || intensity === 0) return;
    const relativeX = Math.max(0, Math.min(1, (pointer.x - bounds.left) / bounds.width));
    const relativeY = Math.max(0, Math.min(1, (pointer.y - bounds.top) / bounds.height));
    const strength = 8 * intensity;
    tilt.style.setProperty("--pass-rotate-x", `${(0.5 - relativeY) * strength * 2}deg`);
    tilt.style.setProperty("--pass-rotate-y", `${(relativeX - 0.5) * strength * 2}deg`);
    tilt.style.setProperty("--pass-pointer-x", `${relativeX * 100}%`);
    tilt.style.setProperty("--pass-pointer-y", `${relativeY * 100}%`);
  }

  function onPointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    boundsRef.current = event.currentTarget.getBoundingClientRect();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || flipped || forceReducedMotion) return;
    pendingPointerRef.current = { x: event.clientX, y: event.clientY };
    if (!frameRef.current) frameRef.current = requestAnimationFrame(applyPendingPointer);
  }

  function onPointerLeave() {
    boundsRef.current = null;
    pendingPointerRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const tilt = tiltRef.current;
    if (!tilt) return;
    tilt.style.setProperty("--pass-rotate-x", "0deg");
    tilt.style.setProperty("--pass-rotate-y", "0deg");
    tilt.style.setProperty("--pass-pointer-x", "50%");
    tilt.style.setProperty("--pass-pointer-y", "35%");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    toggleFace();
  }

  const backgroundImage = safePassAsset(data.backgroundImage);

  return (
    <div
      ref={rootRef}
      className={`${styles.passRoot} ${themeClasses[theme]} ${compact ? styles.compact : ""} ${forceReducedMotion ? styles.forceReduced : ""} ${className}`}
      data-theme={theme}
      data-generic-variant={genericVariant}
      data-visible={visible}
      style={passStyle}
    >
      <div className={styles.scene}>
        <div
          ref={tiltRef}
          className={styles.tiltSurface}
          onPointerEnter={onPointerEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onClick={(event) => { if (!isInteractiveTarget(event.target)) toggleFace(); }}
          onKeyDown={onKeyDown}
          role="group"
          tabIndex={0}
          aria-label={`${themeDefinition.label} pass. ${flipped ? "Details side shown" : "QR side shown"}. Press Enter or Space to flip.`}
        >
          <div className={`${styles.card} ${flipped ? styles.flipped : ""}`}>
            <article className={`${styles.face} ${styles.front}`} aria-hidden={flipped} inert={flipped}>
              {backgroundImage ? <div className={styles.eventArtwork} style={{ backgroundImage: `url("${backgroundImage}")` }} aria-hidden="true" /> : null}
              <PassThemeArt theme={theme} face="front" />
              <div className={styles.glare} aria-hidden="true" />
              <header className={styles.passHeader}>
                <OrganizerMark data={data} />
                {data.status ? <span className={styles.statusBadge}>{data.status}</span> : null}
              </header>
              <div className={styles.eventBlock}>
                <span className={styles.themeKicker}>{themeDefinition.shortLabel} / {data.eventDate}</span>
                <h1>{data.eventName}</h1>
                {data.eventSubtitle ? <p>{data.eventSubtitle}</p> : null}
              </div>
              <span className={styles.passTypeBadge}>{data.passType}</span>
              <PassQr data={data} />
              <div className={styles.identityBlock}>
                {attendeePhoto ? <Image className={styles.attendeePhoto} src={attendeePhoto} alt={`${data.attendeeName} profile`} width={44} height={44} unoptimized /> : null}
                <div className={styles.identityCopy}>
                  <span>Admit</span>
                  <h2>{data.attendeeName}</h2>
                  {data.company ? <p>{data.company}</p> : null}
                </div>
              </div>
              <div className={styles.frontStats}>
                <PassMetadata label={labels.access} value={data.accessLevel} />
                <PassMetadata label={labels.raffle} value={data.raffleTickets} />
              </div>
              <FlipControl face="front" onFlip={toggleFace} />
            </article>

            <article className={`${styles.face} ${styles.back}`} aria-hidden={!flipped} inert={!flipped}>
              <PassThemeArt theme={theme} face="back" />
              <div className={styles.glare} aria-hidden="true" />
              <header className={styles.backHeader}>
                <OrganizerMark data={data} />
                <span>{data.passType}</span>
              </header>
              <div className={styles.backTitle}>
                <span>Credential details</span>
                <h2>{data.attendeeName}</h2>
                <p>{data.eventName}</p>
              </div>
              <div className={styles.metadataGrid}>
                <PassMetadata label="Date" value={data.eventDate} />
                <PassMetadata label="Time" value={data.eventTime} />
                <PassMetadata label={labels.venue} value={data.venueName} />
                <PassMetadata label="Location" value={data.venueLocation} />
                <PassMetadata label="Seat / gate" value={data.gate} />
                <PassMetadata label={labels.passId} value={data.passId} />
                <PassMetadata label="Fallback code" value={data.fallbackCode} />
                <PassMetadata label={labels.access} value={data.accessLevel} />
              </div>
              {data.customMessage ? <p className={styles.customMessage}>{data.customMessage}</p> : null}
              {data.perks.length > 0 ? (
                <div className={styles.perks}><span>Included</span><ul>{data.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul></div>
              ) : null}
              {(data.companionName || data.advisories.length > 0 || data.under21Alert) ? (
                <div className={styles.advisories}>
                  {data.companionName ? <p>Companion: {data.companionName}</p> : null}
                  {data.advisories.length > 0 ? <p>Allergens: {data.advisories.join(", ")}</p> : null}
                  {data.under21Alert ? <p>Age verification required at check-in</p> : null}
                </div>
              ) : null}
              {sponsorLogos.length > 0 ? (
                <div className={styles.sponsors} aria-label="Event sponsors">
                  {sponsorLogos.map((sponsor) => <Image key={sponsor.url} src={sponsor.url} alt={sponsor.name} width={42} height={24} unoptimized />)}
                </div>
              ) : null}
              <FlipControl face="back" onFlip={toggleFace} />
            </article>
          </div>
        </div>
      </div>
      <span className={styles.faceAnnouncement} aria-live="polite">{flipped ? "Pass details shown" : "Pass QR shown"}</span>
    </div>
  );
}
