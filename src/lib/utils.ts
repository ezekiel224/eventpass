import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(value));
}

export function formatTime(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
}

type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function zonedParts(value: string | Date | number, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

export function dateTimePartsInTimeZone(value: string | Date, timeZone: string) {
  const parts = zonedParts(value, timeZone);
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
  };
}

/** Convert an organization-local wall-clock value into its UTC instant. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  if (!isValidTimeZone(timeZone)) throw new RangeError(`Invalid time zone: ${timeZone}`);
  const match = `${date}T${time}`.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new RangeError("Invalid local date or time");

  const desired: ZonedDateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0)
  };
  const desiredAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute, desired.second);
  const calendarCheck = new Date(desiredAsUtc);
  if (
    calendarCheck.getUTCFullYear() !== desired.year ||
    calendarCheck.getUTCMonth() + 1 !== desired.month ||
    calendarCheck.getUTCDate() !== desired.day ||
    calendarCheck.getUTCHours() !== desired.hour ||
    calendarCheck.getUTCMinutes() !== desired.minute
  ) throw new RangeError("Invalid local date or time");

  let instant = desiredAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(instant, timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const adjustment = desiredAsUtc - actualAsUtc;
    instant += adjustment;
    if (adjustment === 0) break;
  }

  const result = new Date(instant);
  const verified = zonedParts(result, timeZone);
  if (Object.keys(desired).some((key) => desired[key as keyof ZonedDateTimeParts] !== verified[key as keyof ZonedDateTimeParts])) {
    throw new RangeError("That local time does not exist in the selected time zone because of daylight saving time.");
  }
  return result;
}

export function endOfDayInTimeZone(date: string, timeZone: string) {
  return new Date(zonedDateTimeToUtc(date, "23:59:59", timeZone).getTime() + 999);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
