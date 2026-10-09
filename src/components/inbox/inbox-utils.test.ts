import { describe, expect, it } from "vitest";
import type { Message } from "@/lib/types";
import { cleanSubject, matchesFilter } from "./inbox-utils";

const message = (patch: Partial<Message>): Message => ({
  id: "msg-x",
  recipientId: "u-ola",
  channel: "teams",
  subject: "Hello",
  body: "",
  receivedAt: "2026-10-09T08:00:00.000Z",
  read: false,
  archived: false,
  important: true,
  needsAction: true,
  replies: [],
  linkedTaskIds: [],
  ...patch,
});

describe("inbox filters", () => {
  it("keeps archived messages out of every filter except Archived", () => {
    const archived = message({ archived: true, channel: "github", projectId: "p-vr" });
    for (const f of ["all", "unread", "important", "action", "github", "projects"] as const) expect(matchesFilter(archived, f)).toBe(false);
    expect(matchesFilter(archived, "archived")).toBe(true);
  });

  it("counts a project-channel update as a project message without a project id", () => {
    expect(matchesFilter(message({ channel: "project" }), "projects")).toBe(true);
    expect(matchesFilter(message({ channel: "teams" }), "projects")).toBe(false);
  });
});

describe("task title from a message subject", () => {
  it("drops reply prefixes and turns notifications into actions", () => {
    expect(cleanSubject("Re: RE: Prototype for the review")).toBe("Prototype for the review");
    expect(cleanSubject("Daan requested your review on vr-lending#42")).toBe("Review vr-lending#42");
    expect(cleanSubject("Summary ready: VR Lending — Project Discussion")).toBe("Follow up on VR Lending — Project Discussion");
  });
});
