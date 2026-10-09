import { describe, expect, it } from "vitest";
import { stateFor } from "@/lib/test-utils";
import { approvesHoursFor } from "@/lib/permissions";
import { teamWeeks, weekFromParam, weekLabel } from "./hours-logic";

const today = "2026-10-09"; // a Friday

describe("week from the ?week= parameter", () => {
  it("opens the week that contains a mid-week date", () => {
    expect(weekFromParam("2026-10-09", today)).toBe("2026-10-05");
  });

  it("falls back to the current week for values that are not real dates", () => {
    expect(weekFromParam("banana", today)).toBe("2026-10-05");
    expect(weekFromParam("2026-13-45", today)).toBe("2026-10-05");
    expect(weekFromParam(null, today)).toBe("2026-10-05");
  });
});

describe("week label", () => {
  it("uses ISO week numbers, including week 53 across the year boundary", () => {
    const label = weekLabel("2026-12-28");
    expect(label).toMatch(/^Week 53\b/);
    expect(label).toContain("28 Dec 2026");
    expect(label).toContain("3 Jan 2027");
  });

  it("names both months when a week spans two months", () => {
    const label = weekLabel("2026-09-28");
    expect(label).toContain("28 Sep");
    expect(label).toContain("4 Oct");
  });
});

describe("team approval weeks", () => {
  const s = stateFor("u-sanne");
  const team = approvesHoursFor("u-sanne");

  it("never shows an approver a team member's draft entries", () => {
    const weeks = teamWeeks(s.hours, team, "submitted");
    expect(s.hours.some((h) => team.includes(h.userId) && h.status === "draft")).toBe(true);
    for (const w of weeks) for (const e of w.entries) expect(e.status).toBe("submitted");
  });

  it("makes one card per person per week, not per day", () => {
    const weeks = teamWeeks(s.hours, team, "submitted");
    expect(weeks.map((w) => w.userId).sort()).toEqual(["u-daan", "u-emma", "u-ola"]);
    for (const w of weeks) expect(w.entries.length).toBeGreaterThan(1);
  });

  it("leaves out people outside the approver's team", () => {
    expect(teamWeeks(s.hours, approvesHoursFor("u-marco"), "submitted")).toEqual([]);
  });
});
