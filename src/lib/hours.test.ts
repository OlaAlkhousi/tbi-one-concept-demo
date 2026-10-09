import { describe, expect, it } from "vitest";
import { entryHours, entryMinutes, formatHours, hoursEntrySchema, totalHours, weekStatus } from "./hours";
import type { HoursEntry } from "./types";

const entry = (p: Partial<HoursEntry>): HoursEntry => ({
  id: "h",
  userId: "u",
  date: "2026-10-07",
  start: "08:30",
  end: "17:00",
  breakMinutes: 30,
  description: "Work",
  status: "draft",
  ...p,
});

describe("hours calculation", () => {
  it("subtracts the break from the worked time", () => {
    expect(entryMinutes(entry({}))).toBe(480);
    expect(formatHours(entryHours(entry({})))).toBe("8:00");
  });

  it("uses real elapsed time on the night clocks go back (Europe/Amsterdam)", () => {
    // 25 Oct 2026: 03:00 CEST becomes 02:00 CET, so 01:00–04:00 is 4 real hours.
    expect(entryMinutes(entry({ date: "2026-10-25", start: "01:00", end: "04:00", breakMinutes: 0 }))).toBe(240);
  });

  it("uses real elapsed time on the night clocks go forward", () => {
    // 29 Mar 2026: 02:00 CET becomes 03:00 CEST, so 01:00–04:00 is 2 real hours.
    expect(entryMinutes(entry({ date: "2026-03-29", start: "01:00", end: "04:00", breakMinutes: 0 }))).toBe(120);
  });

  it("totals a week and formats minutes", () => {
    const week = [entry({}), entry({ date: "2026-10-08", start: "09:00", end: "12:15", breakMinutes: 0 })];
    expect(formatHours(totalHours(week))).toBe("11:15");
  });

  it("reports the least advanced status for a week", () => {
    expect(weekStatus([])).toBe("empty");
    expect(weekStatus([entry({ status: "approved" }), entry({ status: "draft" })])).toBe("draft");
    expect(weekStatus([entry({ status: "approved" }), entry({ status: "submitted" })])).toBe("submitted");
  });

  it("rejects an end time before the start time and a break longer than the work", () => {
    const base = { date: "2026-10-07", start: "09:00", end: "08:00", breakMinutes: 0, description: "Work" };
    expect(hoursEntrySchema.safeParse(base).success).toBe(false);
    expect(hoursEntrySchema.safeParse({ ...base, end: "10:00", breakMinutes: 90 }).success).toBe(false);
    expect(hoursEntrySchema.safeParse({ ...base, end: "10:00", breakMinutes: 15 }).success).toBe(true);
  });
});
