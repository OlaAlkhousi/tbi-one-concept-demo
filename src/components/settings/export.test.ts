import { describe, expect, it } from "vitest";
import { NOW, stateFor } from "@/lib/test-utils";
import { exportMyData } from "./export";

describe("demo data export", () => {
  it("contains only the current user's private records, also for a manager", () => {
    const s = {
      ...stateFor("u-sanne"),
      conversations: { "u-ola": [{ id: "x", role: "user" as const, text: "private question", at: NOW.toISOString() }] },
    };
    const out = exportMyData(s, NOW);
    expect(out.messages.every((m) => m.recipientId === "u-sanne")).toBe(true);
    expect(out.hours.every((h) => h.userId === "u-sanne")).toBe(true);
    expect(out.logbook.every((l) => l.userId === "u-sanne")).toBe(true);
    expect(out.notifications.every((n) => n.userId === "u-sanne")).toBe(true);
    expect(out.assistantConversation).toEqual([]);
  });
});
