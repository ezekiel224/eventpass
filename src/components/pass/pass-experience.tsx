"use client";

import { NormalizedPassData } from "@/components/pass/pass-system";
import { PassViewer } from "@/components/passes/PassViewer";

export function PassExperience({
  data
}: {
  data: NormalizedPassData;
}) {
  return (
    <section className="grid w-full justify-items-center" aria-label="Digital event pass">
      <PassViewer
        guestName={data.attendeeName}
        ticketType={data.passType}
        qrValue={data.fallbackCode ?? data.passId}
        qrImageUrl={data.qrDataUrl}
        eventName={data.eventName}
        eventDate={data.eventDate}
        eventTime={data.eventTime}
        venue={data.venueName}
        address={data.venueLocation ?? undefined}
        passId={data.passId}
        company={data.company ?? undefined}
        accessLevel={data.accessLevel ?? undefined}
        raffleTickets={data.raffleTickets}
        companionName={data.companionName}
        under21Alert={data.under21Alert}
      />
    </section>
  );
}
