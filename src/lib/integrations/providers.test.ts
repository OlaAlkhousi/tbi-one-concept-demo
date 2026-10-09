import { describe, expect, it } from "vitest";
import { stateFor } from "../test-utils";
import { createMockProviders, graphProviderStub } from "./providers";

const providers = createMockProviders(() => stateFor("u-ola"), () => {
  throw new Error("not used");
});

describe("mock providers", () => {
  it("apply the same permissions as the UI", async () => {
    const repos = await providers.code.listRepositories({ userId: "u-ola" });
    expect(repos.map((r) => r.id)).not.toContain("r-smart");
    const daanRepos = await providers.code.listRepositories({ userId: "u-daan" });
    expect(daanRepos.map((r) => r.id)).toContain("r-smart");
  });

  it("only return the user's own messages and never send", async () => {
    const msgs = await providers.mail.listMessages({ userId: "u-sanne" });
    expect(msgs.every((m) => m.recipientId === "u-sanne")).toBe(true);
    await expect(providers.mail.sendReply({ userId: "u-sanne" }, msgs[0].id, "Hi")).resolves.toMatchObject({ sent: false });
  });

  it("refuse to pretend a real integration exists", async () => {
    await expect(graphProviderStub.mail.listMessages({ userId: "u-ola" })).rejects.toThrow(/not connected/);
  });
});
