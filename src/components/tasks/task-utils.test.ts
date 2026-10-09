import { describe, expect, it } from "vitest";
import { stateFor } from "@/lib/test-utils";
import type { Task } from "@/lib/types";
import { canSeeTask, groupOf, relatedTasks } from "./task-utils";

const task = (patch: Partial<Task>): Task => ({
  id: "t-x",
  title: "Something",
  description: "",
  assigneeId: "u-ola",
  creatorId: "u-ola",
  status: "todo",
  priority: "medium",
  createdAt: "2026-10-01T08:00:00.000Z",
  source: { type: "manual" },
  tags: [],
  ...patch,
});

describe("task grouping", () => {
  const today = "2026-10-09";

  it("buckets open tasks by deadline relative to today", () => {
    expect(groupOf(task({ due: "2026-10-08" }), today)).toBe("overdue");
    expect(groupOf(task({ due: "2026-10-09" }), today)).toBe("today");
    expect(groupOf(task({ due: "2026-10-16" }), today)).toBe("week");
    expect(groupOf(task({ due: "2026-10-17" }), today)).toBe("later");
    expect(groupOf(task({}), today)).toBe("none");
  });

  it("puts completed tasks under Done even when their deadline has passed", () => {
    expect(groupOf(task({ due: "2026-10-01", status: "done" }), today)).toBe("done");
  });
});

describe("task visibility", () => {
  it("hides restricted project tasks and other people's personal tasks", () => {
    const s = stateFor("u-ola");
    const byId = (id: string) => s.tasks.find((t) => t.id === id)!;
    expect(canSeeTask(s, byId("t-daan-4"))).toBe(false); // Smart Building is restricted
    expect(canSeeTask(s, byId("t-sanne-1"))).toBe(false); // Sanne's personal task
    expect(canSeeTask(s, byId("t-bram-2"))).toBe(true); // internal project
    expect(canSeeTask(s, byId("t-ola-5"))).toBe(true); // own personal task
  });
});

describe("duplicate check", () => {
  it("flags a similar open task in the same project, never the task itself", () => {
    const s = stateFor("u-ola");
    const review = s.tasks.find((t) => t.id === "t-ola-4")!;
    const ids = relatedTasks(s, review).map((r) => r.task.id);
    expect(ids).toContain("t-emma-1");
    expect(ids).not.toContain("t-ola-4");
  });
});
