import { describe, expect, it } from "vitest";
import type { LogbookEntry } from "@/lib/types";
import { groupByWeek, visibleLogbook } from "./logbook-logic";

const entry = (p: Partial<LogbookEntry> & Pick<LogbookEntry, "id" | "date">): LogbookEntry => ({
  userId: "u-ola",
  kind: "daily",
  title: p.id,
  projectIds: [],
  completed: "",
  challenges: "",
  learnings: "",
  decisions: "",
  nextSteps: "",
  createdAt: `${p.date}T15:00:00.000Z`,
  updatedAt: `${p.date}T15:00:00.000Z`,
  generated: false,
  ...p,
});

describe("logbook week groups", () => {
  it("puts the weekly report at the top of its week, above later daily entries", () => {
    const groups = groupByWeek([entry({ id: "thu", date: "2026-10-08" }), entry({ id: "report", date: "2026-10-05", kind: "weekly" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["report", "thu"]);
  });

  it("shows the newest week first", () => {
    const groups = groupByWeek([entry({ id: "old", date: "2026-09-29" }), entry({ id: "new", date: "2026-10-06" })]);
    expect(groups.map((g) => g.monday)).toEqual(["2026-10-05", "2026-09-28"]);
  });
});

describe("visible logbook", () => {
  const all = [
    entry({ id: "mine", date: "2026-10-06", learnings: "Rebasing a branch" }),
    entry({ id: "theirs", date: "2026-10-06", userId: "u-daan", learnings: "Rebasing a branch" }),
  ];

  it("never includes another person's entries, even when they match the search", () => {
    expect(visibleLogbook(all, "u-ola", { query: "rebasing" }).map((e) => e.id)).toEqual(["mine"]);
  });

  it("searches the sections, not only the title", () => {
    expect(visibleLogbook(all, "u-ola", { query: "rebasing" })).toHaveLength(1);
    expect(visibleLogbook(all, "u-ola", { query: "kubernetes" })).toHaveLength(0);
  });
});
