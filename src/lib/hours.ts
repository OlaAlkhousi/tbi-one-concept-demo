import { z } from "zod";
import { TZ, mondayOf, weekDates } from "./time";
import { fromZonedTime } from "date-fns-tz";
import type { HoursEntry, HoursStatus, ISODate } from "./types";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validation for the hours form. Errors are written for the person filling it in. */
export const hoursEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    start: z.string().regex(timeRe, "Use HH:mm, e.g. 08:30"),
    end: z.string().regex(timeRe, "Use HH:mm, e.g. 17:00"),
    breakMinutes: z.number().int("Whole minutes only").min(0, "Break can't be negative").max(240, "Break is at most 4 hours"),
    projectId: z.string().optional(),
    description: z.string().trim().min(3, "Describe what you worked on").max(280),
  })
  .refine((v) => v.end > v.start, { message: "End time must be after start time", path: ["end"] })
  .refine((v) => entryMinutes(v) > 0, { message: "Break is longer than the time worked", path: ["breakMinutes"] });

/**
 * Worked minutes for one entry. Start and end are Amsterdam wall-clock times, so we
 * convert both to real instants first: on the night clocks change (last Sunday of
 * March/October) the real duration differs from the naive "end − start".
 */
export function entryMinutes(e: Pick<HoursEntry, "date" | "start" | "end" | "breakMinutes">): number {
  const start = fromZonedTime(`${e.date}T${e.start}:00`, TZ).getTime();
  const end = fromZonedTime(`${e.date}T${e.end}:00`, TZ).getTime();
  return Math.round((end - start) / 60000) - e.breakMinutes;
}

export function entryHours(e: Pick<HoursEntry, "date" | "start" | "end" | "breakMinutes">): number {
  return Math.max(0, entryMinutes(e)) / 60;
}

export function formatHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

export function entriesForWeek(entries: HoursEntry[], userId: string, monday: ISODate): HoursEntry[] {
  const days = new Set(weekDates(monday));
  return entries
    .filter((e) => e.userId === userId && days.has(e.date))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export function totalHours(entries: HoursEntry[]): number {
  return entries.reduce((sum, e) => sum + entryHours(e), 0);
}

/** One status for the whole week: the "least advanced" status of its entries. */
export function weekStatus(entries: HoursEntry[]): HoursStatus | "empty" {
  if (entries.length === 0) return "empty";
  const order: HoursStatus[] = ["rejected", "draft", "submitted", "approved"];
  return entries.map((e) => e.status).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
}

export function hoursByProject(entries: HoursEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    const key = e.projectId ?? "none";
    out[key] = (out[key] ?? 0) + entryHours(e);
  }
  return out;
}

export function weekOf(date: ISODate): ISODate {
  return mondayOf(date);
}
