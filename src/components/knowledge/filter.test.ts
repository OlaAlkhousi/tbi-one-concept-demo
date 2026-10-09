import { describe, expect, it } from "vitest";
import { stateFor } from "@/lib/test-utils";
import { filterDocuments, popularTags, type DocFilter } from "./filter";

const none: DocFilter = { query: "", category: "all", tag: null, related: false };
const ids = (s: ReturnType<typeof stateFor>, f: Partial<DocFilter>) => filterDocuments(s, { ...none, ...f }).map((r) => r.doc.id);

describe("knowledge filters", () => {
  it("never lets tags reveal a restricted document the user can't read", () => {
    const ola = stateFor("u-ola");
    // "finance" is only a tag of the restricted budget forecast.
    expect(popularTags(ola, 100)).not.toContain("finance");
    expect(ids(ola, { tag: "budget" })).not.toContain("d-budget");
    // Someone on the reader list does get the tag.
    expect(popularTags(stateFor("u-sanne"), 100)).toContain("finance");
  });

  it("keeps restricted documents findable by title, marked unreadable, so access can be requested", () => {
    const hit = filterDocuments(stateFor("u-ola"), { ...none, query: "budget forecast" }).find((r) => r.doc.id === "d-budget");
    expect(hit?.readable).toBe(false);
  });
});
