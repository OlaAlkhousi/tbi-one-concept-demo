import { describe, expect, it } from "vitest";
import { NOW, stateFor } from "../test-utils";
import { dateOf, toISODate } from "../time";
import { morningBriefing } from "./briefing";
import { projectInsights, similarProjects } from "./insights";
import { learningRecommendations } from "./learning";
import { generateActionPlan, shortTitle } from "./meeting-actions";
import { generateWorkSummary } from "./work-summary";

const today = toISODate(NOW);

describe("meeting action plan", () => {
  const s = stateFor("u-ola");
  const plan = generateActionPlan(s, "m-vr-discussion", today);

  it("creates one suggestion per action point, with reasons", () => {
    expect(plan).toHaveLength(4);
    for (const sg of plan) {
      expect(sg.ownerReason).not.toBe("");
      expect(sg.priorityReason).not.toBe("");
      expect(sg.dueReason).not.toBe("");
    }
  });

  it("detects that the availability fix already exists as Daan's task", () => {
    const availability = plan[0];
    expect(availability.duplicate).toMatchObject({ kind: "task", id: "t-daan-1" });
    expect(availability.ownerId).toBe("u-daan");
    expect(availability.priority).toBe("urgent");
  });

  it("offers to link the confirmation flow to the unowned open issue, and shows Emma's wireframes as related", () => {
    expect(plan[1].duplicate).toBeUndefined();
    expect(plan[1].linkIssue?.id).toBe("i-vr-40");
    expect(plan[1].related.map((r) => r.id)).toContain("t-emma-1");
  });

  it("plans the prototype before the prototype review and gives it to Ola, who was asked", () => {
    const prototype = plan[3];
    const review = s.meetings.find((m) => m.id === "m-vr-prototype")!;
    expect(prototype.ownerId).toBe("u-ola");
    expect(prototype.due < dateOf(review.start)).toBe(true);
  });

  it("suggests reusing the approval connector for the approval feature", () => {
    expect(plan[2].description).toMatch(/approval connector/);
  });

  it("shortens action points into task titles", () => {
    expect(shortTitle("Improve equipment availability checks so items in maintenance can't be reserved.")).toBe("Improve equipment availability checks");
  });
});

describe("project insights", () => {
  it("backs every VR recommendation with evidence", () => {
    const insights = projectInsights(stateFor(), "p-vr", today);
    expect(insights.length).toBeGreaterThanOrEqual(3);
    for (const i of insights) expect(i.evidence.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.title.includes("Approval"))).toBe(true);
    expect(insights.some((i) => i.title.includes("Availability check ignores maintenance periods"))).toBe(true);
  });
});

describe("similar projects", () => {
  it("never suggests a project the user cannot see", () => {
    const s = stateFor("u-ola");
    const vr = s.projects.find((p) => p.id === "p-vr")!;
    expect(similarProjects(s, vr).map((x) => x.project.id)).not.toContain("p-smart");
    const daan = stateFor("u-daan");
    expect(similarProjects(daan, vr).map((x) => x.project.id)).toContain("p-smart");
  });
});

describe("work summary", () => {
  it("never invents hours that were not registered", () => {
    const s = stateFor("u-ola");
    s.hours = s.hours.filter((h) => h.userId !== "u-ola");
    const { draft, facts } = generateWorkSummary(s, "u-ola", "2026-10-05");
    expect(draft.completed).toMatch(/No hours registered/);
    expect(facts.find((f) => f.label === "Registered hours")?.value).toBe("none");
  });

  it("includes completed tasks and registered hours from the week", () => {
    const { draft } = generateWorkSummary(stateFor("u-ola"), "u-ola", "2026-10-05");
    expect(draft.completed).toMatch(/Implement project board columns/);
    expect(draft.completed).toMatch(/Registered hours: 24:00/); // Mon–Wed, 8h each
    expect(draft.generated).toBe(true);
  });
});

describe("learning recommendations", () => {
  it("links recommendations to the employee's projects", () => {
    const recs = learningRecommendations(stateFor("u-ola"));
    const azure = recs.find((r) => r.skill === "Microsoft Azure");
    expect(azure?.reason).toMatch(/VR Equipment Lending Service/);
  });
});

describe("morning briefing", () => {
  it("differs per persona", () => {
    const ola = morningBriefing(stateFor("u-ola"), NOW);
    const sanne = morningBriefing(stateFor("u-sanne"), NOW);
    expect(ola.greeting).toBe("Good morning, Ola.");
    expect(sanne.lines.some((l) => l.href === "/requests")).toBe(true);
    expect(ola.lines.some((l) => l.href === "/requests")).toBe(false);
  });
});
