"use client";

import Image from "next/image";
import { QrCode, Ticket } from "lucide-react";
import type { EventPassDetails } from "@/components/passes/pass-types";
import styles from "@/components/passes/NeoBrutalistPass.module.css";

export interface NeoBrutalistPassProps extends EventPassDetails {
  className?: string;
}

export function NeoBrutalistPass({
  className = "",
  guestName,
  ticketType,
  qrValue,
  qrImageUrl,
  eventName,
  eventDate,
  eventTime,
  venue,
  address,
  passId,
  company,
  accessLevel,
  raffleTickets,
  companionName,
  under21Alert
}: NeoBrutalistPassProps) {
  const passReference = passId ? passId.slice(-8).toUpperCase() : "DIGITAL";
  const guestCount = companionName ? 2 : 1;
  const hasRaffleTickets = raffleTickets !== null && raffleTickets !== undefined;

  return (
    <article className={`${styles.pass} ${className}`} aria-label={`${eventName} pass for ${guestName}`}>
      <header className={styles.masthead}>
        <span className={styles.wordmark}>Praxis</span>
      </header>

      <section className={styles.eventBlock}>
        <p className={styles.eventMeta}>{eventDate}{eventTime ? ` · ${eventTime}` : ""}</p>
        <h1>{eventName}</h1>
        <p className={styles.venue}>{venue ?? "Event admission"}</p>
      </section>

      <section className={styles.guestBlock}>
        <div className={styles.guestHeading}>
          <div>
            <p className={styles.label}>Guest</p>
            <h2>{guestName}</h2>
            {company ? <p className={styles.company}>{company}</p> : null}
          </div>
          <span className={styles.ticketType}><Ticket aria-hidden="true" /> {accessLevel ?? ticketType}</span>
        </div>
        {companionName ? (
          <p className={styles.companion}><strong>Guest 2</strong> {companionName}</p>
        ) : null}
      </section>

      {under21Alert ? <div className={styles.ageAlert}>Age verification required at entry</div> : null}

      <section className={styles.qrSection} aria-label="Pass QR code">
        <div className={styles.qrFrame} title={qrValue}>
          {qrImageUrl ? (
            <Image src={qrImageUrl} width={320} height={320} alt={`QR code for ${guestName}`} unoptimized priority />
          ) : (
            <div className={styles.qrPlaceholder}>
              <QrCode aria-hidden="true" />
              <span>QR unavailable</span>
            </div>
          )}
        </div>
        <div className={styles.fallback}>
          <span>Can’t scan?</span>
          <strong>{qrValue}</strong>
        </div>
      </section>

      <dl className={`${styles.details} ${hasRaffleTickets ? "" : styles.detailsTwo}`}>
        <div><dt>Guests</dt><dd>{guestCount}</dd></div>
        <div><dt>Access</dt><dd>{ticketType}</dd></div>
        {hasRaffleTickets ? <div><dt>Raffle</dt><dd>{raffleTickets}</dd></div> : null}
      </dl>

      {address ? <p className={styles.address}>{address}</p> : null}

      <footer className={styles.footer}>
        <span>Present at entry</span>
        <span>Pass {passReference}</span>
      </footer>
    </article>
  );
}
