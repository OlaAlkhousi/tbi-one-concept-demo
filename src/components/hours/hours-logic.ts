import { entryHours, totalHours } from "@/lib/hours";
import { addDaysISO, formatDate, mondayOf, toISODate } from "@/lib/time";
import { fromZonedTime } from "date-fns-tz";
import type { HoursEntry, HoursStatus, ID, ISODate } from "@/lib/types";
import { TZ } from "@/lib/time";

/** Monday of the week named by `?week=`, or of the current week when the value is missing or not a real date. */
export function weekFromParam(param: string | null, today: ISODate): ISODate {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const d = fromZonedTime(`${param}T12:00:00`, TZ);
    if (!Number.isNaN(d.getTime()) && toISODate(d) === param) return mondayOf(param);
  }
  return mondayOf(today);
}

/** "Week 41 · 5–11 Oct 2026", "Week 40 · 28 Sep – 4 Oct 2026", "Week 53 · 28 Dec 2026 – 3 Jan 2027". */
export function weekLabel(monday: ISODate): string {
  const sunday = addDaysISO(monday, 6);
  const week = `Week ${formatDate(monday, "I")}`;
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const sameMonth = sameYear && monday.slice(5, 7) === sunday.slice(5, 7);
  const range = sameMonth
    ? `${formatDate(monday, "d")}–${formatDate(sunday, "d MMM yyyy")}`
    : sameYear
      ? `${formatDate(monday, "d MMM")} – ${formatDate(sunday, "d MMM yyyy")}`
      : `${formatDate(monday, "d MMM yyyy")} – ${formatDate(sunday, "d MMM yyyy")}`;
  return `${week} · ${range}`;
}

export interface TeamWeek {
  userId: ID;
  monday: ISODate;
  entries: HoursEntry[];
  total: number;
}

/**
 * One card per team member per week, built only from entries with the given status.
 * Approvers see submitted and approved hours of their team; drafts and returned entries
 * stay with the employee.
 */
export function teamWeeks(hours: HoursEntry[], memberIds: ID[], status: Extract<HoursStatus, "submitted" | "approved">): TeamWeek[] {
  const groups = new Map<string, TeamWeek>();
  for (const e of hours) {
    if (e.status !== status || !memberIds.includes(e.userId)) continue;
    const monday = mondayOf(e.date);
    const key = `${e.userId}|${monday}`;
    const g = groups.get(key) ?? { userId: e.userId, monday, entries: [], total: 0 };
    g.entries.push(e);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, entries: g.entries.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)), total: totalHours(g.entries) }))
    .sort((a, b) => (status === "submitted" ? a.monday.localeCompare(b.monday) : b.monday.localeCompare(a.monday)) || a.userId.localeCompare(b.userId));
}

/** Hours per calendar day of the week, Monday first. */
export function hoursPerDay(entries: HoursEntry[], days: ISODate[]): { date: ISODate; hours: number }[] {
  return days.map((date) => ({ date, hours: entries.filter((e) => e.date === date).reduce((sum, e) => sum + entryHours(e), 0) }));
}
