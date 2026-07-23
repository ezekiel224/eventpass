"use client";

import dynamic from "next/dynamic";
import { GenericVariant, NormalizedPassData, PassFace, PassThemeId } from "@/components/pass/pass-system";

const PassViewer = dynamic(
  () => import("@/components/passes/PassViewer").then((module) => module.PassViewer),
  {
    ssr: false,
    loading: () => <div className="aspect-[4/5.65] w-full max-w-[480px] animate-pulse rounded-[1.7rem] border border-white/10 bg-black/20" aria-label="Loading 3D event pass" />
  }
);

export function PassExperience({
  data,
  theme = "minimal",
  forceReducedMotion = false,
  genericVariant = "dark",
  face,
  onFaceChange,
  staticPreview = false
}: {
  data: NormalizedPassData;
  theme?: PassThemeId;
  forceReducedMotion?: boolean;
  genericVariant?: GenericVariant;
  face?: PassFace;
  onFaceChange?: (face: PassFace) => void;
  staticPreview?: boolean;
}) {
  return (
    <section className="grid w-full justify-items-center" aria-label="Interactive 3D digital event pass">
      <PassViewer
        theme={theme}
        finish={genericVariant}
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
        showMap={!staticPreview}
        forceReducedMotion={forceReducedMotion}
        face={face}
        onFaceChange={onFaceChange}
        staticPreview={staticPreview}
      />
    </section>
  );
}
