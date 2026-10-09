import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Optional LLM mode (Mode B) for the TBI ONE Assistant.
 *
 * Disabled unless ASSISTANT_PROVIDER=anthropic and ANTHROPIC_API_KEY are set on the
 * server. The key never reaches the browser. The model only receives the grounded,
 * permission-filtered answer that the demo engine already produced, and is told to
 * rephrase it without adding facts.
 *
 * NOTE: in a production version the server would do retrieval itself, based on the
 * signed-in user's Entra ID identity, instead of trusting grounding sent by the client.
 */

const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5-5";

function enabled() {
  return process.env.ASSISTANT_PROVIDER === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function GET() {
  return Response.json(enabled() ? { enabled: true, provider: "Anthropic Claude", model: MODEL } : { enabled: false });
}

const bodySchema = z.object({
  question: z.string().min(1).max(1000),
  grounding: z.string().min(1).max(8000),
  sources: z.array(z.string().max(300)).max(20),
  actions: z.array(z.string().max(200)).max(10),
});

const SYSTEM = `You are the TBI ONE Assistant inside a fictional concept demo of an employee workspace.
You receive an employee's question and a GROUNDED ANSWER produced by the workspace's retrieval engine, which already applied the employee's permissions.
Rewrite the grounded answer so it reads naturally and helpfully. Rules:
- Use only facts present in the grounded answer and sources. Do not invent people, dates, numbers, documents or content.
- If the grounded answer says something is restricted or unavailable, keep that meaning and do not speculate about the restricted content.
- Keep it concise (under 180 words). You may use **bold** and "- " bullet lists.
- Do not claim to have performed actions. Proposed actions are shown to the user separately for confirmation.`;

export async function POST(req: Request) {
  if (!enabled()) return Response.json({ error: "LLM mode is not configured" }, { status: 501 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { question, grounding, sources, actions } = parsed.data;

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `QUESTION:\n${question}\n\nGROUNDED ANSWER:\n${grounding}\n\nSOURCES:\n${sources.join("\n") || "(none)"}\n\nPROPOSED ACTIONS (shown separately):\n${actions.join("\n") || "(none)"}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "The model declined to answer" }, { status: 502 });
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return Response.json({ error: "Empty response" }, { status: 502 });
    return Response.json({ text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "Rate limited" }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return Response.json({ error: "Model credentials are invalid" }, { status: 502 });
    if (error instanceof Anthropic.APIError) return Response.json({ error: `Model error ${error.status ?? ""}` }, { status: 502 });
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
}
