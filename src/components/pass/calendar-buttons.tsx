"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarButtonsProps = {
  className?: string;
  attendeeId: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  address: string;
};

function googleDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function CalendarButtons({ className = "", attendeeId, eventName, startsAt, endsAt, venue, address }: CalendarButtonsProps) {
  function openGoogleCalendar() {
    const passUrl = window.location.href.split("#")[0];
    const parameters = new URLSearchParams({
      action: "TEMPLATE",
      text: eventName,
      dates: `${googleDate(startsAt)}/${googleDate(endsAt)}`,
      location: [venue, address].filter(Boolean).join(", "),
      details: `Your individual event pass: ${passUrl}`
    });
    window.open(`https://calendar.google.com/calendar/render?${parameters.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={className}>
      <a href={`/api/attendees/${attendeeId}/calendar`} download>
        <Button type="button" variant="secondary"><CalendarDays className="h-4 w-4" /> Apple</Button>
      </a>
      <Button type="button" variant="secondary" onClick={openGoogleCalendar}><ExternalLink className="h-4 w-4" /> Google</Button>
    </div>
  );
}
