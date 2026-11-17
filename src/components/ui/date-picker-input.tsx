"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover } from "tamagui";
import { cn } from "@/lib/utils";
import "./date-picker-input.css";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fromValue(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12);
}

function toValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerInput({
  value,
  onValueChange,
  min,
  max,
  placeholder = "Select Date",
  disabled,
  id,
  name,
  required,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const selected = fromValue(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());

  const days = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset, 12);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, inCurrentMonth: date.getMonth() === month };
    });
  }, [view]);

  const minDate = fromValue(min);
  const maxDate = fromValue(max);
  const displayValue = selected
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(selected)
    : "";
  const openPicker = () => {
    if (disabled) return;
    if (selected) setView(selected);
    setOpen(true);
  };

  return <Popover open={open} onOpenChange={(nextOpen) => { if (nextOpen && selected) setView(selected); setOpen(nextOpen); }} placement="bottom" allowFlip>
    <div className={cn("ep-date-picker-field", ariaInvalid && "is-invalid", disabled && "is-disabled", className)}>
      <input
        id={id}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="dialog"
        onClick={openPicker}
        onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); openPicker(); } }}
      />
      {value && !disabled ? <button type="button" className="ep-date-picker-reset" aria-label="Clear date" onClick={() => onValueChange("")}><X /></button> : null}
      <Popover.Trigger asChild>
        <button type="button" className="ep-date-picker-open" aria-label="Open calendar" disabled={disabled}><CalendarDays /></button>
      </Popover.Trigger>
      <input type="hidden" name={name} value={value} required={required} />
    </div>

    <Popover.Content className="ep-date-picker-popover" aria-label="Choose a date">
      <Popover.Arrow className="ep-date-picker-arrow" />
      <header className="ep-date-picker-head">
        <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft /></button>
        <div><span>{view.getFullYear()}</span><strong>{new Intl.DateTimeFormat(undefined, { month: "long" }).format(view)}</strong></div>
        <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight /></button>
      </header>
      <div className="ep-date-picker-week" aria-hidden="true">{dayNames.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="ep-date-picker-grid" key={`${view.getFullYear()}-${view.getMonth()}`}>
        {days.map(({ date, inCurrentMonth }) => {
          const dateValue = toValue(date);
          const outOfRange = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
          return <button
            key={dateValue}
            type="button"
            disabled={!inCurrentMonth || outOfRange}
            data-outside={!inCurrentMonth || undefined}
            aria-pressed={dateValue === value}
            aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(date)}
            onClick={() => { onValueChange(dateValue); setOpen(false); }}
          >{String(date.getDate()).padStart(2, "0")}</button>;
        })}
      </div>
    </Popover.Content>
  </Popover>;
}
