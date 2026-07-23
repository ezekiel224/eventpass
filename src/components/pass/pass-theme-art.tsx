"use client";

import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { PassFace, PassThemeId } from "@/components/pass/pass-system";
import styles from "@/components/pass/collectible-pass.module.css";

function CasinoArt({ showRoulette }: { showRoulette: boolean }) {
  const [spin, setSpin] = useState(0);
  const pockets = ["0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27"];

  return (
    <div className={styles.casinoArt}>
      <span className={styles.casinoMarquee}>PRIVATE TABLE · NO. 07</span>
      <span className={styles.casinoSuitA}>♠</span>
      <span className={styles.casinoSuitB}>♦</span>
      <span className={styles.casinoCardFan}><i>♣</i><i>Q</i><i>★</i></span>
      {showRoulette ? (
        <button
          type="button"
          className={styles.rouletteButton}
          onClick={(event) => {
            event.stopPropagation();
            setSpin((value) => value + 1);
          }}
          aria-label="Spin decorative roulette wheel"
          title="Spin roulette"
        >
          <span key={spin} className={styles.rouletteWheel}>
            <span className={styles.rouletteHub} />
            {pockets.map((pocket, index) => (
              <span
                key={`${pocket}-${index}`}
                className={`${styles.roulettePocket} ${index === 0 ? styles.rouletteZero : ""}`}
                style={{ "--roulette-index": index } as CSSProperties}
              >
                {pocket}
              </span>
            ))}
          </span>
          <span className={styles.rouletteBall} />
        </button>
      ) : null}
      <span className={styles.casinoChip}><i /><i /><i /><i /></span>
    </div>
  );
}

function GalaArt() {
  const foilPatternId = useId().replaceAll(":", "");

  return (
    <div className={styles.galaArt} aria-hidden="true">
      <svg viewBox="0 0 320 520" preserveAspectRatio="none">
        <defs>
          <pattern id={foilPatternId} width="1" height="1" patternContentUnits="objectBoundingBox">
            <image href="/textures/gala-gold-foil.jpg" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>
        <g stroke={`url(#${foilPatternId})`}>
          <path d="M22 116V22h92M206 22h92v94M298 404v94h-92M114 498H22v-94" />
          <path d="M42 98V42h54M224 42h54v56M278 422v56h-54M96 478H42v-56" />
          <path d="M160 16l18 18-18 18-18-18zM160 468l18 18-18 18-18-18z" />
        </g>
      </svg>
      <span className={styles.galaMonogram}>EP</span>
      <span className={styles.galaRibbon}>PRIVATE INVITATION · ADMIT ONE</span>
    </div>
  );
}

function ArcadeArt() {
  return (
    <div className={styles.arcadeArt} aria-hidden="true">
      <span className={styles.arcadeScore}><i>1UP</i><b>002650</b></span>
      <span className={styles.pixelAlien}><i /><i /></span>
      <span className={styles.pixelShip} />
      <span className={styles.pixelStarA}>+</span>
      <span className={styles.pixelStarB}>✦</span>
      <span className={styles.arcadeScanline} />
      <span className={styles.arcadeProgress}><i /></span>
      <span className={styles.arcadeCoin}>● × 03</span>
    </div>
  );
}

function ScienceArt() {
  return (
    <div className={styles.scienceArt} aria-hidden="true">
      <span className={styles.scienceReadout}><i>OBS / 024</i><b>STABLE SIGNAL</b></span>
      <span className={styles.atomCore}>
        <i /><i /><i /><b />
      </span>
      <svg className={styles.waveform} viewBox="0 0 240 44" preserveAspectRatio="none">
        <polyline points="0,23 18,23 28,7 38,39 48,17 58,23 82,23 94,11 106,34 118,22 144,22 154,4 166,42 178,17 190,23 240,23" />
      </svg>
      <span className={styles.scienceScan} />
      <span className={styles.scienceTicks}>02&nbsp;&nbsp;04&nbsp;&nbsp;06&nbsp;&nbsp;08&nbsp;&nbsp;10</span>
      <span className={styles.scienceBarcode} />
    </div>
  );
}

function BiologyArt() {
  return (
    <div className={styles.biologyArt} aria-hidden="true">
      <span className={styles.bioTaxonomy}><i>FIELD NOTE 07</i><b>VIVIDAE / ADMIT ONE</b></span>
      <span className={styles.bioCellA}><i /></span>
      <span className={styles.bioCellB}><i /></span>
      <span className={styles.bioCellC} />
      <span className={styles.dnaHelix}>
        {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--dna-index": index } as CSSProperties} />)}
      </span>
      <svg className={styles.bioBranch} viewBox="0 0 180 180">
        <path d="M8 168C40 130 44 95 78 74s52-32 86-66M51 108C30 96 24 77 19 58M79 74c4-23-2-39-15-54M109 54c18 3 32-2 46-16" />
      </svg>
    </div>
  );
}

function SpaceArt() {
  return (
    <div className={styles.spaceArt} aria-hidden="true">
      <span className={styles.missionPatch}><i>EP</i><b>ORBIT 24</b></span>
      <span className={styles.starLayerFar} />
      <span className={styles.starLayerNear} />
      <span className={styles.nebula} />
      <span className={styles.planet}><i /></span>
      <span className={styles.orbit}><i /></span>
      <span className={styles.shootingStar} />
      <svg className={styles.constellation} viewBox="0 0 150 110">
        <polyline points="8,78 38,45 72,57 94,20 139,36 118,88 72,57" />
        {["8,78", "38,45", "72,57", "94,20", "139,36", "118,88"].map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="2.5" />;
        })}
      </svg>
      <svg className={styles.trajectory} viewBox="0 0 200 80"><path d="M4 68C48 8 112 4 194 51" /><circle cx="4" cy="68" r="3" /><circle cx="194" cy="51" r="3" /></svg>
    </div>
  );
}

function MinimalArt() {
  return (
    <div className={styles.minimalArt} aria-hidden="true">
      <span className={styles.minimalOrb} />
      <span className={styles.minimalRule} />
      <span className={styles.minimalIndex}>EP / DIGITAL CREDENTIAL</span>
      <span className={styles.minimalSerial}>SERIES / 001</span>
      <span className={styles.minimalCorner}>+</span>
    </div>
  );
}

export function PassThemeArt({ theme, face = "front" }: { theme: PassThemeId; face?: PassFace }) {
  if (theme === "casino") return <CasinoArt showRoulette={face === "front"} />;
  if (theme === "gala") return <GalaArt />;
  if (theme === "ice-cream") return <MinimalArt />;
  if (theme === "retro-arcade") return <ArcadeArt />;
  if (theme === "science") return <ScienceArt />;
  if (theme === "biology") return <BiologyArt />;
  if (theme === "space") return <SpaceArt />;
  return <MinimalArt />;
}
