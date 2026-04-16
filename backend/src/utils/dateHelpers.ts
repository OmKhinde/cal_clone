import { addMinutes, getDay, isAfter } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { DayOfWeek } from "../types/enums.js";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
];

export function getDayOfWeekForDate(date: string, timezone: string): DayOfWeek {
  const middayUtc = fromZonedTime(`${date}T12:00:00`, timezone);
  return DAY_MAP[getDay(middayUtc)];
}

export function localTimeToUtc(date: string, time: string, timezone: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

export function addMinutesUtc(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

export function isFuture(date: Date): boolean {
  return isAfter(date, new Date());
}

export function formatSlotLabel(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "hh:mm a");
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}
