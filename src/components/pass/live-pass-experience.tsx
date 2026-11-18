"use client";

import { useCallback, useEffect, useState } from "react";
import { PassExperience } from "@/components/pass/pass-experience";
import type { NormalizedPassData } from "@/components/pass/pass-system";

export function LivePassExperience({
  attendeeId,
  initialData
}: {
  attendeeId: string;
  initialData: NormalizedPassData;
}) {
  const [data, setData] = useState(initialData);

  const refreshPass = useCallback(async () => {
    try {
      const response = await fetch(`/api/pass/${attendeeId}/raffle-tickets`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setData((current) => ({
        ...current,
        ...(typeof payload.remainingTickets === "number" ? { raffleTickets: payload.remainingTickets } : {}),
        ...(typeof payload.attendeeName === "string" ? { attendeeName: payload.attendeeName } : {}),
        ...(payload.company === null || typeof payload.company === "string" ? { company: payload.company } : {}),
        ...(typeof payload.passType === "string" ? { passType: payload.passType } : {}),
        ...(payload.accessLevel === null || typeof payload.accessLevel === "string" ? { accessLevel: payload.accessLevel } : {}),
        ...(payload.companionName === null || typeof payload.companionName === "string" ? { companionName: payload.companionName } : {}),
        ...(typeof payload.under21Alert === "boolean" ? { under21Alert: payload.under21Alert } : {})
      }));
    } catch {
      // Keep the last known pass details when the device is temporarily offline.
    }
  }, [attendeeId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshPass();
    }, 3000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshPass();
    };
    window.addEventListener("focus", refreshPass);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshPass);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshPass]);

  return <PassExperience data={data} />;
}
