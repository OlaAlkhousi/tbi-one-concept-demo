import { describe, expect, it } from "vitest";
import { answer } from "@/lib/ai/assistant/engine";
import { employees } from "@/lib/data/people";
import { NOW, stateFor } from "@/lib/test-utils";
import { askAboutPrompt, projectsOf } from "./directory";

describe("people directory", () => {
  it("lists only projects the viewer may see on a colleague's profile", () => {
    expect(projectsOf(stateFor("u-ola"), "u-daan").map((p) => p.id)).not.toContain("p-smart");
    expect(projectsOf(stateFor("u-daan"), "u-daan").map((p) => p.id)).toContain("p-smart");
  });

  it("asks the assistant a question whose answer is about that colleague", () => {
    for (const e of employees) {
      const viewer = e.id === "u-ola" ? "u-daan" : "u-ola";
      const reply = answer(stateFor(viewer), askAboutPrompt(e), null, NOW);
      expect(reply.sources?.map((x) => x.id), `${e.name}: "${askAboutPrompt(e)}"`).toContain(e.id);
    }
  });
});
