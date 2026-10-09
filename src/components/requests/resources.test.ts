import { describe, expect, it } from "vitest";
import { stateFor } from "@/lib/test-utils";
import { requestableResources } from "./resources";

describe("request access picker", () => {
  it("offers exactly the restricted resources the user cannot open yet", () => {
    expect(requestableResources(stateFor("u-ola")).map((r) => r.id).sort()).toEqual(["d-budget", "d-smart-arch", "p-smart"]);
    // Sanne is on the budget reader list, but being a manager gives her nothing else.
    expect(requestableResources(stateFor("u-sanne")).map((r) => r.id).sort()).toEqual(["d-smart-arch", "p-smart"]);
  });
});
