"use client";

import Link from "next/link";
import { BookOpen, CheckSquare, Lock, MessageSquareQuote, ShieldCheck, Sparkles } from "lucide-react";
import { usePageContext, useS } from "@/components/common/hooks";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { me, myOpenTasks, myProjects, visibleDocuments } from "@/lib/selectors";
import { useWorkspace } from "@/store/workspace";

const principles = [
  { icon: BookOpen, title: "Grounded", text: "Answers come from workspace records and show their sources." },
  { icon: Lock, title: "Permission-aware", text: "It only uses what you are allowed to see. Restricted content stays hidden." },
  { icon: ShieldCheck, title: "You confirm", text: "It proposes tasks, issues and drafts. Nothing changes until you confirm." },
  { icon: MessageSquareQuote, title: "Honest", text: "Labelled as simulated AI. It says so when it doesn't know." },
];

export default function AssistantPage() {
  const s = useS();
  const user = me(s);
  const ask = useWorkspace((x) => x.askAssistant);
  usePageContext({ kind: "page", label: "AI workspace" });

  const tasks = myOpenTasks(s).slice(0, 3);
  const projects = myProjects(s).slice(0, 3);
  const docs = visibleDocuments(s).slice(0, 3);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <h1 className="sr-only">AI workspace</h1>
      <section className="flex h-[calc(100dvh-8.5rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-card shadow-card">
        <AssistantChat variant="page" />
      </section>

      <aside className="space-y-4">
        <div className="ai-surface rounded-xl border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-ai" aria-hidden /> AI workspace
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            The assistant knows you are {user.firstName}, {user.role.toLowerCase()}, and works across your projects, meetings, inbox, documents, people, hours and learning.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Ask about…</p>
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => ask(`What is the progress of ${p.name}?`)} className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted">
                  {p.name}
                </button>
              </li>
            ))}
            {tasks.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => ask(`Create a task to follow up on ${t.title.toLowerCase()}`)} className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted">
                  <CheckSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">Follow up: {t.title}</span>
                </button>
              </li>
            ))}
            {docs.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => ask(`Where can I find the ${d.title}?`)} className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted">
                  <BookOpen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{d.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">How it behaves</p>
          <ul className="space-y-3">
            {principles.map((p) => (
              <li key={p.title} className="flex gap-2.5">
                <p.icon className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/settings" className="mt-4 block text-xs text-primary hover:underline">
            Assistant settings & LLM mode →
          </Link>
        </div>
      </aside>
    </div>
  );
}
