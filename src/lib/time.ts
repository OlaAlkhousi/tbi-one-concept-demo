import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ISODate, ISODateTime } from "./types";

/** All wall-clock times in TBI ONE are interpreted in this zone. */
export const TZ = "Europe/Amsterdam";

/** "2026-10-09" for the given instant, as seen in Amsterdam. */
export function toISODate(d: Date = new Date()): ISODate {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** Converts an Amsterdam wall-clock date + "HH:mm" to a UTC ISO timestamp. */
export function zonedISO(date: ISODate, time: string): ISODateTime {
  return fromZonedTime(`${date}T${time}:00`, TZ).toISOString();
}

/** Adds whole calendar days to an ISO date string. */
export function addDaysISO(date: ISODate, days: number): ISODate {
  // Noon avoids any DST edge when stepping across calendar days.
  return toISODate(addDays(fromZonedTime(`${date}T12:00:00`, TZ), days));
}

/** Monday of the week containing `date` (ISO weeks start on Monday). */
export function mondayOf(date: ISODate): ISODate {
  const dow = Number(formatInTimeZone(fromZonedTime(`${date}T12:00:00`, TZ), TZ, "i")); // 1 = Monday
  return addDaysISO(date, 1 - dow);
}

export function weekDates(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function formatTime(iso: ISODateTime): string {
  return formatInTimeZone(parseISO(iso), TZ, "HH:mm");
}

export function formatDate(date: ISODate | ISODateTime, pattern = "EEE d MMM"): string {
  const d = date.length === 10 ? fromZonedTime(`${date}T12:00:00`, TZ) : parseISO(date);
  return formatInTimeZone(d, TZ, pattern);
}

export function dateOf(iso: ISODateTime): ISODate {
  return formatInTimeZone(parseISO(iso), TZ, "yyyy-MM-dd");
}

/** Hour of day (0–23) in Amsterdam, used for the greeting. */
export function hourInTZ(d: Date = new Date()): number {
  return Number(formatInTimeZone(d, TZ, "H"));
}

export function greeting(d: Date = new Date()): string {
  const h = hourInTZ(d);
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "in 3 days", "today", "2 days overdue" relative to `today`. */
export function relativeDue(due: ISODate, today: ISODate): { label: string; tone: "overdue" | "soon" | "later" } {
  const diff = daysBetween(today, due);
  if (diff < 0) return { label: `${-diff} day${diff === -1 ? "" : "s"} overdue`, tone: "overdue" };
  if (diff === 0) return { label: "Due today", tone: "soon" };
  if (diff === 1) return { label: "Due tomorrow", tone: "soon" };
  if (diff <= 7) return { label: `Due in ${diff} days`, tone: "later" };
  return { label: `Due ${formatDate(due, "d MMM")}`, tone: "later" };
}

export function timeAgo(iso: ISODateTime, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - parseISO(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, "d MMM");
}
