import { describe, expect, it } from "vitest";
import { NOW, stateFor } from "@/lib/test-utils";
import { addDaysISO, toISODate, zonedISO } from "@/lib/time";
import type { Activity } from "@/lib/types";
import { achievements } from "./achievements";

const today = toISODate(NOW);
const unlocked = (s: ReturnType<typeof stateFor>, id: string) => achievements(s, today).find((a) => a.id === id)!.unlocked;

describe("learning achievements", () => {
  it("unlocks Security aware only when every security lesson is done, not on enrolment", () => {
    const s = stateFor("u-ola");
    expect(s.learning[0].enrolledCourseIds).toContain("c-security");
    expect(unlocked(s, "security")).toBe(false);

    const done = { ...s, learning: s.learning.map((p) => (p.userId === "u-ola" ? { ...p, completedLessons: { ...p.completedLessons, "c-security": ["c-security-l1", "c-security-l2", "c-security-l3", "c-security-l4"] } } : p)) };
    expect(unlocked(done, "security")).toBe(true);
  });

  it("counts only this person's lessons from this week towards 5 lessons this week", () => {
    const s = stateFor("u-ola");
    const lesson = (actorId: string, date: string, n: number): Activity => ({ id: `x-${actorId}-${date}-${n}`, at: zonedISO(date, "10:00"), actorId, source: "learning", text: "completed a lesson" });
    const mineThisWeek = s.activity.filter((a) => a.actorId === "u-ola" && a.source === "learning").length;
    const missing = 5 - mineThisWeek;
    const noise = [lesson("u-daan", today, 1), lesson("u-daan", today, 2), lesson("u-ola", addDaysISO(today, -7), 1)];
    const almost = { ...s, activity: [...Array.from({ length: missing - 1 }, (_, i) => lesson("u-ola", today, i)), ...noise, ...s.activity] };
    expect(unlocked(almost, "week5")).toBe(false);

    const enough = { ...almost, activity: [lesson("u-ola", today, 99), ...almost.activity] };
    expect(unlocked(enough, "week5")).toBe(true);
  });
});
