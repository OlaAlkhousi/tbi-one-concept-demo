"use client";

import { useId, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/store/workspace";
import { AiBadge } from "@/components/common/layout";
import { cn } from "@/lib/utils";

/** AI entry point that hands a typed question to the assistant panel. Used by Knowledge and People. */
export function AskBox({
  title,
  description,
  placeholder,
  suggestions = [],
  className,
}: {
  title: string;
  description: string;
  placeholder: string;
  suggestions?: string[];
  className?: string;
}) {
  const ask = useWorkspace((x) => x.askAssistant);
  const [question, setQuestion] = useState("");
  const id = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    ask(q);
    setQuestion("");
  }

  return (
    <section className={cn("ai-surface rounded-xl border p-4 shadow-card", className)} aria-labelledby={`${id}-title`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-ai" aria-hidden /> {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <AiBadge className="shrink-0" />
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor={`${id}-input`} className="sr-only">
          {title}
        </label>
        <Input id={`${id}-input`} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={placeholder} className="h-9 bg-card/80" autoComplete="off" />
        <Button type="submit" size="lg" disabled={!question.trim()} aria-label="Ask the assistant">
          <ArrowUp /> <span className="hidden sm:inline">Ask</span>
        </Button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-ai/15 bg-card/70 px-2.5 py-1 text-left text-xs text-foreground/80 transition hover:border-ai/30 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
