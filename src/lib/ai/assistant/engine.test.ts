import { describe, expect, it } from "vitest";
import { NOW, stateFor } from "../../test-utils";
import { answer } from "./engine";

const ask = (q: string, user = "u-ola", page: Parameters<typeof answer>[2] = null) => answer(stateFor(user), q, page, NOW);

describe("assistant intent routing", () => {
  const cases: [string, string][] = [
    ["What should I focus on today?", "focus"],
    ["What happened during yesterday's project meeting?", "last-meeting"],
    ["Create GitHub issues from these meeting decisions.", "meeting-tasks"],
    ["Which emails need my response?", "messages"],
    ["What is the quarterly report?", "document"],
    ["What is the progress of my project?", "progress"],
    ["Who has experience with Azure?", "people"],
    ["Who can approve my access request?", "approver"],
    ["Can you prepare a message for my supervisor?", "draft-message"],
    ["What have I accomplished this week?", "completed"],
    ["Can you prepare my logbook?", "work-summary"],
    ["How many hours have I worked?", "hours"],
    ["What should I learn to become better at my current work?", "learning"],
    ["What meetings do I have tomorrow?", "meetings"],
    ["What are our blockers?", "blockers"],
    ["What features should we consider adding to VR lending?", "improvements"],
    ["What is the procedure for requesting equipment?", "document"],
    ["Who can review my prototype?", "reviewer"],
    ["Who is responsible for the Innovation Portal?", "owner"],
    ["What happened while I was away?", "catch-up"],
    ["Draft a GitHub issue", "draft-issue"],
    ["Open the hours page", "navigate"],
  ];
  it.each(cases)("%s → %s", (q, intent) => {
    expect(ask(q).intent).toBe(intent);
  });

  it("explains when a question is outside the demo scope", () => {
    const r = ask("What is the weather in Rotterdam?");
    expect(r.intent).toBe("help");
    expect(r.text).toMatch(/can't answer/);
  });
});

describe("assistant grounding", () => {
  it("prioritises the overdue mandatory module or today's urgent bug", () => {
    const r = ask("What should I focus on today?");
    expect(r.sources?.[0]?.kind).toBe("task");
    expect(["t-ola-5", "t-ola-2"]).toContain(r.sources?.[0]?.id);
  });

  it("finds Priya for Azure and explains why", () => {
    const r = ask("Who knows about Azure?");
    expect(r.sources?.[0]?.id).toBe("u-priya");
    expect(r.text).toMatch(/Microsoft Azure/);
  });

  it("answers the equipment procedure from the accessible document", () => {
    const r = ask("What is the procedure for requesting equipment?");
    expect(r.sources?.[0]?.id).toBe("d-equipment");
  });

  it("uses the current page as context", () => {
    const r = ask("What is the progress of this project?", "u-ola", { kind: "project", id: "p-portal", label: "Innovation Projects Portal" });
    expect(r.text).toMatch(/Innovation Projects Portal/);
  });
});

describe("assistant permissions", () => {
  it("does not reveal restricted project details and offers an access request", () => {
    const r = ask("What is the progress of the Smart Building Platform?");
    expect(r.intent).toBe("restricted");
    expect(r.text).not.toMatch(/alarm|sensor|gateway|%/i);
    expect(r.actions?.[0]?.action.kind).toBe("access-request");
  });

  it("does not quote restricted documents", () => {
    const r = ask("Where can I find the smart building security architecture?");
    expect(r.text).not.toMatch(/segmentation|credentials|60 seconds/i);
  });

  it("lets a team member see the same project", () => {
    expect(ask("What is the progress of the Smart Building Platform?", "u-daan").intent).toBe("progress");
  });
});
