import type { S } from "../../selectors";
import { answer, type AssistantPage, type AssistantReply } from "./engine";

/**
 * Assistant provider adapter.
 *
 * Mode A ("demo") — the deterministic engine in engine.ts. Always available, no API key,
 *   no network. This is what the demo runs on.
 *
 * Mode B ("llm") — optional. The demo engine still does intent detection, permission-aware
 *   retrieval and action proposals. Only the *grounded* result (text + source titles the
 *   user may see) is sent to the server route /api/assistant, which asks an approved model
 *   to rewrite it in natural language. The model never receives the raw workspace data,
 *   so it cannot reveal restricted content, and it never executes actions itself.
 *
 * A future real integration (e.g. Microsoft Foundry or another approved model) only needs a
 * new server-side implementation behind the same route.
 */

export interface AssistantProvider {
  id: "demo" | "llm";
  label: string;
  answer(s: S, question: string, page: AssistantPage | null): Promise<AssistantReply & { engine: "demo" | "llm" }>;
}

export const demoProvider: AssistantProvider = {
  id: "demo",
  label: "Demo engine (simulated AI, runs locally)",
  async answer(s, question, page) {
    // Small delay so the UI can show a thinking state; the engine itself is instant.
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 300));
    return { ...answer(s, question, page), engine: "demo" };
  },
};

export interface LlmStatus {
  enabled: boolean;
  provider?: string;
  model?: string;
}

export async function fetchLlmStatus(): Promise<LlmStatus> {
  try {
    const res = await fetch("/api/assistant", { method: "GET" });
    if (!res.ok) return { enabled: false };
    return (await res.json()) as LlmStatus;
  } catch {
    return { enabled: false };
  }
}

export const llmProvider: AssistantProvider = {
  id: "llm",
  label: "Configured language model (server-side)",
  async answer(s, question, page) {
    const grounded = answer(s, question, page);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          grounding: grounded.text,
          sources: (grounded.sources ?? []).map((x) => `${x.kind}: ${x.title}${x.subtitle ? ` (${x.subtitle})` : ""}`),
          actions: (grounded.actions ?? []).map((a) => a.label),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { text: string };
      return { ...grounded, text: data.text, engine: "llm" };
    } catch {
      // Fall back to the grounded demo answer; never fail the user.
      return { ...grounded, text: `${grounded.text}\n\n_The language model was unavailable, so this is the demo engine's answer._`, engine: "demo" };
    }
  },
};
