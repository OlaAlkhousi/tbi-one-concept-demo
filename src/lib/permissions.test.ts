import { describe, expect, it } from "vitest";
import { documents } from "./data/catalog";
import { canViewDocument, canViewMeeting, canViewProject } from "./permissions";
import { myActivity, visibleIssues } from "./selectors";
import { search } from "./search";
import { stateFor } from "./test-utils";

const smart = (s: ReturnType<typeof stateFor>) => s.projects.find((p) => p.id === "p-smart")!;
const doc = (id: string) => documents.find((d) => d.id === id)!;

describe("simulated permissions", () => {
  it("hides a restricted project from someone outside its team", () => {
    const s = stateFor("u-ola");
    expect(canViewProject(s, "u-ola", smart(s))).toBe(false);
    expect(canViewProject(s, "u-daan", smart(s))).toBe(true);
  });

  it("grants access after an approved request", () => {
    const s = stateFor("u-ola");
    s.accessGrants.push({ userId: "u-ola", resourceType: "project", resourceId: "p-smart", grantedBy: "u-sanne", at: "" });
    expect(canViewProject(s, "u-ola", smart(s))).toBe(true);
    expect(canViewDocument(s, "u-ola", doc("d-smart-arch"))).toBe(true);
  });

  it("does not give managers automatic access to restricted content", () => {
    const s = stateFor("u-sanne");
    expect(canViewDocument(s, "u-sanne", doc("d-smart-arch"))).toBe(false);
  });

  it("keeps one-to-one meetings private to their participants", () => {
    const s = stateFor("u-daan");
    const checkIn = s.meetings.find((m) => m.id === "m-mentor")!;
    expect(canViewMeeting(s, "u-daan", checkIn)).toBe(false);
    expect(canViewMeeting(s, "u-ola", checkIn)).toBe(true);
  });

  it("hides issues of restricted repositories and restricted activity", () => {
    const s = stateFor("u-ola");
    expect(visibleIssues(s).some((i) => i.repoId === "r-smart")).toBe(false);
    expect(myActivity(s).some((a) => a.projectId === "p-smart")).toBe(false);
  });
});

describe("permission-aware search", () => {
  it("finds connected records for 'VR lending'", () => {
    const groups = new Set(search(stateFor(), "VR lending").map((r) => r.group));
    for (const g of ["Projects", "Meetings", "Tasks", "Documents", "GitHub issues"]) expect(groups).toContain(g);
  });

  it("never matches restricted content, only restricted titles", () => {
    const s = stateFor("u-ola");
    // "segmentation" only appears inside the restricted security architecture document.
    expect(search(s, "segmentation")).toHaveLength(0);
    const locked = search(s, "smart building").filter((r) => r.locked);
    expect(locked.map((r) => r.id)).toContain("p-smart");
    expect(locked.every((r) => r.subtitle.startsWith("Restricted"))).toBe(true);
  });

  it("does find restricted content for team members", () => {
    expect(search(stateFor("u-daan"), "segmentation").some((r) => r.id === "d-smart-arch")).toBe(true);
  });
});
