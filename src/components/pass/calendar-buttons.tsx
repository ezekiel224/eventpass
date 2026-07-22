"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type CalendarButtonsProps = {
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

export function CalendarButtons({ attendeeId, eventName, startsAt, endsAt, venue, address }: CalendarButtonsProps) {
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
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <a href={`/api/attendees/${attendeeId}/calendar`} download>
        <Button type="button" variant="secondary" className="w-full"><CalendarDays className="h-4 w-4" /> Apple iCal</Button>
      </a>
      <Button type="button" variant="secondary" className="w-full" onClick={openGoogleCalendar}><ExternalLink className="h-4 w-4" /> Google Calendar</Button>
    </div>
  );
}
