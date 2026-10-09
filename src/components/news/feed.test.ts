import { describe, expect, it } from "vitest";
import { stateFor } from "@/lib/test-utils";
import { forYou } from "./feed";

describe("personalised news", () => {
  it("shows each persona its own and company-wide news, with news about own projects first", () => {
    const ola = forYou(stateFor("u-ola")).map((n) => n.id);
    expect(ola).toContain("n-4"); // company-wide
    expect(ola).not.toContain("n-6"); // for leads and PMs only
    expect(["n-1", "n-5"]).toContain(ola[0]); // about Ola's projects

    const sanne = forYou(stateFor("u-sanne")).map((n) => n.id);
    expect(sanne).toContain("n-6");
    expect(sanne).not.toContain("n-7"); // for interns and developers only
  });
});
