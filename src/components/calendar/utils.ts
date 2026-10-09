"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { addDaysISO, daysBetween, formatDate, formatTime, mondayOf, weekDates } from "@/lib/time";
import type { ISODate, ISODateTime, Meeting } from "@/lib/types";

export type CalendarView = "day" | "week" | "month" | "agenda";

/** Minutes since midnight, Amsterdam wall-clock time. */
export function minutesOf(iso: ISODateTime): number {
  const [h, m] = formatTime(iso).split(":").map(Number);
  return h * 60 + m;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: ISODate): number {
  return Number(formatDate(date, "i"));
}

export const isWeekend = (date: ISODate) => isoWeekday(date) >= 6;

export function monthStart(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

/** First day of the month `n` months after the month of `date`. */
export function addMonths(date: ISODate, n: number): ISODate {
  const [y, m] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/** Monday-first grid of whole weeks covering the month of `date`. */
export function monthGrid(date: ISODate): ISODate[] {
  const first = monthStart(date);
  const start = mondayOf(first);
  const weeks = Math.ceil(daysBetween(start, addMonths(first, 1)) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDaysISO(start, i));
}

/** Steps a weekday date by `n` working days (day view skips empty weekends). */
export function stepWorkday(date: ISODate, n: 1 | -1): ISODate {
  let d = addDaysISO(date, n);
  while (isWeekend(d)) d = addDaysISO(d, n);
  return d;
}

export const AGENDA_DAYS = 14;

export function rangeFor(view: CalendarView, anchor: ISODate): ISODate[] {
  switch (view) {
    case "day":
      return [anchor];
    case "week":
      return weekDates(mondayOf(anchor));
    case "month":
      return monthGrid(anchor);
    case "agenda":
      return Array.from({ length: AGENDA_DAYS }, (_, i) => addDaysISO(mondayOf(anchor), i));
  }
}

export function stepAnchor(view: CalendarView, anchor: ISODate, dir: 1 | -1): ISODate {
  switch (view) {
    case "day":
      return stepWorkday(anchor, dir);
    case "week":
      return addDaysISO(mondayOf(anchor), 7 * dir);
    case "month":
      return addMonths(anchor, dir);
    case "agenda":
      return addDaysISO(mondayOf(anchor), AGENDA_DAYS * dir);
  }
}

export function rangeLabel(view: CalendarView, anchor: ISODate): string {
  const range = rangeFor(view, anchor);
  const first = range[0];
  const last = range[range.length - 1];
  if (view === "day") return formatDate(anchor, "EEEE d MMMM yyyy");
  if (view === "month") return formatDate(anchor, "MMMM yyyy");
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return `${formatDate(first, sameMonth ? "d" : "d MMM")} – ${formatDate(last, "d MMM yyyy")}`;
}

/** "Today", "Tomorrow", "Yesterday" or undefined. */
export function relativeDay(date: ISODate, today: ISODate): string | undefined {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return undefined;
}

export function durationLabel(m: Meeting): string {
  const mins = Math.round((new Date(m.end).getTime() - new Date(m.start).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export type MeetingPhase = "upcoming" | "live" | "ended";

export function meetingPhase(m: Meeting, now: Date): MeetingPhase {
  if (new Date(m.end) <= now) return "ended";
  if (new Date(m.start) <= now) return "live";
  return "upcoming";
}

/** A finished meeting whose action points have not been turned into tasks yet. */
export function needsActionPlan(m: Meeting, now: Date): boolean {
  return Boolean(m.actionPoints?.length) && !m.actionPlanCreatedAt && new Date(m.end) < now;
}

/**
 * Project colour as CSS variables, with a light and a dark variant.
 * Meetings without a project get a quiet slate tone.
 */
export function meetingTone(hue: number | undefined): CSSProperties {
  const h = hue ?? 264;
  const k = hue === undefined ? 0.18 : 1;
  const c = (x: number) => (x * k).toFixed(3);
  return {
    "--ev-bg": `oklch(0.955 ${c(0.035)} ${h})`,
    "--ev-fg": `oklch(0.33 ${c(0.09)} ${h})`,
    "--ev-bar": `oklch(0.6 ${c(0.14)} ${h})`,
    "--ev-bg-d": `oklch(0.31 ${c(0.06)} ${h})`,
    "--ev-fg-d": `oklch(0.93 ${c(0.04)} ${h})`,
    "--ev-bar-d": `oklch(0.72 ${c(0.13)} ${h})`,
  } as CSSProperties;
}

export const toneClass = "bg-(--ev-bg) text-(--ev-fg) dark:bg-(--ev-bg-d) dark:text-(--ev-fg-d)";
export const barClass = "bg-(--ev-bar) dark:bg-(--ev-bar-d)";
export const borderToneClass = "border-(--ev-bar) dark:border-(--ev-bar-d)";

/** Solid swatch for legends and dots. */
export const hueSwatch = (hue: number | undefined): CSSProperties => ({ background: hue === undefined ? "var(--muted-foreground)" : `oklch(0.62 0.14 ${hue})` });

export interface Placed {
  meeting: Meeting;
  start: number;
  end: number;
  col: number;
  cols: number;
}

/**
 * Side-by-side layout for overlapping meetings in one day column.
 * Greedy column packing per cluster of overlapping meetings.
 * `minSpan` stretches very short meetings so their label stays readable.
 */
export function layoutDay(meetings: Meeting[], minSpan = 25): Placed[] {
  const items = meetings
    .map((m) => {
      const start = minutesOf(m.start);
      return { meeting: m, start, end: Math.max(minutesOf(m.end), start + minSpan) };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed[] = [];
  let cluster: { item: (typeof items)[number]; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const c of cluster) out.push({ ...c.item, col: c.col, cols: colEnds.length });
    cluster = [];
    colEnds = [];
  };
  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else colEnds[col] = item.end;
    cluster.push({ item, col });
    clusterEnd = cluster.length === 1 ? item.end : Math.max(clusterEnd, item.end);
  }
  flush();
  return out;
}

/** Current time, refreshed every minute (for the "now" line and live badges). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** The seed writes some dates as "2026-10-13"; show them as readable dates. */
export function prettifyDates(text: string): string {
  return text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (iso) => formatDate(iso, "EEEE d MMMM"));
}
