"use client";

import { useCallback, useEffect, useState } from "react";
import { PassExperience } from "@/components/pass/pass-experience";
import type { NormalizedPassData, PassThemeId } from "@/components/pass/pass-system";

export function LivePassExperience({
  attendeeId,
  initialData,
  theme
}: {
  attendeeId: string;
  initialData: NormalizedPassData;
  theme: PassThemeId;
}) {
  const [data, setData] = useState(initialData);

  const refreshTickets = useCallback(async () => {
    try {
      const response = await fetch(`/api/pass/${attendeeId}/raffle-tickets`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (typeof payload.remainingTickets === "number") {
        setData((current) =>
          current.raffleTickets === payload.remainingTickets
            ? current
            : { ...current, raffleTickets: payload.remainingTickets }
        );
      }
    } catch {
      // Keep the last known count when the device is temporarily offline.
    }
  }, [attendeeId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshTickets();
    }, 3000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshTickets();
    };
    window.addEventListener("focus", refreshTickets);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshTickets);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshTickets]);

  return <PassExperience data={data} theme={theme} />;
}
