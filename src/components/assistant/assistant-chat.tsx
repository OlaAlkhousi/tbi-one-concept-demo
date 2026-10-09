"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  Copy,
  FolderKanban,
  GitBranch,
  GraduationCap,
  Mail,
  Maximize2,
  NotebookPen,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { demoProvider, fetchLlmStatus, llmProvider, type LlmStatus } from "@/lib/ai/assistant/provider";
import { employeeById, me, type S } from "@/lib/selectors";
import { repositories } from "@/lib/data/catalog";
import { formatDate } from "@/lib/time";
import type { AssistantAction, AssistantMessage, SourceCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/utils-id";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "@/components/common/hooks";
import { AiBadge } from "@/components/common/layout";
import { RichText } from "@/components/common/rich-text";

/** Stable empty list: a new [] in a Zustand selector would re-render forever. */
const NO_MESSAGES: AssistantMessage[] = [];

const SUGGESTIONS: Record<string, string[]> = {
  intern: [
    "What should I focus on today?",
    "What happened during yesterday's project meeting?",
    "Who knows about Azure?",
    "What should I learn for my projects?",
    "Can you prepare my logbook?",
    "What is the procedure for requesting equipment?",
  ],
  developer: ["What should I focus on today?", "What are our blockers?", "Draft a GitHub issue", "Which emails need my response?", "How many hours have I worked this week?", "Who can help with GitHub?"],
  lead: ["What should I focus on today?", "What are our blockers?", "Which emails need my response?", "What is the progress of the Smart Building Platform?", "What happened while I was away?", "Who can approve a project request?"],
  pm: ["What is the progress of VR lending?", "What are the blockers for VR lending?", "What improvements do you recommend for VR lending?", "Prepare a message for Lisa about the steering committee", "Which other projects are similar to VR lending?", "Which emails need my response?"],
};

const sourceIcon: Record<SourceCard["kind"], LucideIcon> = {
  project: FolderKanban,
  task: CheckSquare,
  meeting: CalendarDays,
  document: BookOpen,
  person: UserRound,
  issue: GitBranch,
  message: Mail,
  course: GraduationCap,
  hours: Clock,
  logbook: NotebookPen,
};

function Sources({ sources, onNavigate }: { sources: SourceCard[]; onNavigate?: () => void }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.slice(0, 6).map((src) => {
          const Icon = sourceIcon[src.kind];
          return (
            <Link
              key={`${src.kind}-${src.id}`}
              href={src.href}
              onClick={onNavigate}
              className="group inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs transition hover:border-primary/40 hover:bg-accent"
              title={src.subtitle}
            >
              <Icon className="size-3 shrink-0 text-muted-foreground group-hover:text-accent-foreground" aria-hidden />
              <span className="truncate">{src.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ActionCard({ msg, act, onNavigate }: { msg: AssistantMessage; act: AssistantAction; onNavigate?: () => void }) {
  const router = useRouter();
  const s = useS();
  const createTask = useWorkspace((x) => x.createTask);
  const createIssue = useWorkspace((x) => x.createIssue);
  const replyToMessage = useWorkspace((x) => x.replyToMessage);
  const setStatus = useWorkspace((x) => x.setAssistantActionStatus);
  const pageContext = useWorkspace((x) => x.pageContext);
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const a = act.action;
  const done = act.status === "done";
  const dismissed = act.status === "dismissed";

  if (a.kind === "navigate") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={() => {
          router.push(a.href);
          onNavigate?.();
        }}
      >
        {act.label} →
      </Button>
    );
  }

  const confirm = () => {
    if (a.kind === "create-task") {
      const t = createTask(a.task);
      toast.success("Task created", { description: t.title, action: { label: "Open", onClick: () => router.push(`/tasks?task=${t.id}`) } });
    } else if (a.kind === "create-issue") {
      const i = createIssue(a.issue);
      toast.success(`Simulated issue #${i.number} created`, { description: "Visible in the GitHub workspace. Nothing was sent to GitHub." });
    } else if (a.kind === "draft-message") {
      const ctxMsg = pageContext?.kind === "message" ? s.messages.find((m) => m.id === pageContext.id && m.fromId === a.toId) : undefined;
      if (ctxMsg) {
        replyToMessage(ctxMsg.id, a.body);
        toast.success("Reply saved in the demo inbox", { description: "Simulated — no message was sent." });
      } else {
        void navigator.clipboard?.writeText(a.body).catch(() => undefined);
        toast.success("Draft copied to clipboard", { description: "TBI ONE never sends messages in this demo." });
      }
    } else if (a.kind === "access-request") {
      openAccessDialog(a.resourceType, a.resourceId, a.reason);
      return; // the dialog itself confirms
    }
    setStatus(msg.id, act.id, "done");
  };

  const detail =
    a.kind === "create-task" ? (
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <dt>Owner</dt>
        <dd className="text-foreground">{employeeById(a.task.assigneeId)?.name}</dd>
        {a.task.projectId && (
          <>
            <dt>Project</dt>
            <dd className="text-foreground">{s.projects.find((p) => p.id === a.task.projectId)?.name}</dd>
          </>
        )}
        <dt>Priority</dt>
        <dd className="text-foreground capitalize">{a.task.priority}</dd>
        {a.task.due && (
          <>
            <dt>Due</dt>
            <dd className="text-foreground">{formatDate(a.task.due)}</dd>
          </>
        )}
      </dl>
    ) : a.kind === "create-issue" ? (
      <p className="mt-1 text-xs text-muted-foreground">
        in <span className="font-mono">{repositories.find((r) => r.id === a.issue.repoId)?.fullName}</span> · simulated
      </p>
    ) : a.kind === "draft-message" ? (
      <div className="mt-2 rounded-md border bg-background p-2.5 text-xs whitespace-pre-wrap">{a.body}</div>
    ) : null;

  const Icon = a.kind === "create-task" ? CheckSquare : a.kind === "create-issue" ? GitBranch : a.kind === "draft-message" ? Mail : ShieldCheck;

  return (
    <div className={cn("rounded-lg border bg-card p-3 text-sm shadow-card", (done || dismissed) && "opacity-70")} data-testid="assistant-action">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{act.label}</p>
          {detail}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="size-3.5" /> Done
          </span>
        ) : dismissed ? (
          <span className="text-xs text-muted-foreground">Dismissed</span>
        ) : (
          <>
            <Button size="sm" className="h-7" onClick={confirm} data-testid="assistant-action-confirm">
              {a.kind === "draft-message" ? <Copy /> : <Check />}
              {a.kind === "draft-message" ? "Use draft" : a.kind === "access-request" ? "Review request" : "Confirm"}
            </Button>
            {a.kind === "create-task" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  openTaskDialog({ initial: a.task, onCreated: () => setStatus(msg.id, act.id, "done") });
                }}
              >
                <Pencil /> Edit first
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => setStatus(msg.id, act.id, "dismissed")}>
              <X /> Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function AssistantChat({ variant = "panel", onClose }: { variant?: "panel" | "page"; onClose?: () => void }) {
  const s = useS();
  const user = me(s);
  const router = useRouter();
  const messages = useWorkspace((x) => x.conversations[x.currentUserId] ?? NO_MESSAGES);
  const add = useWorkspace((x) => x.addAssistantMessage);
  const clear = useWorkspace((x) => x.clearConversation);
  const pageContext = useWorkspace((x) => x.pageContext);
  const mode = useWorkspace((x) => x.assistantMode);
  const consumePending = useWorkspace((x) => x.consumePendingPrompt);
  const pending = useWorkspace((x) => x.pendingAssistantPrompt);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [llm, setLlm] = useState<LlmStatus>({ enabled: false });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void fetchLlmStatus().then(setLlm);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    add({ id: uid("m"), role: "user", text: q, at: new Date().toISOString() });
    setThinking(true);
    const provider = mode === "llm" && llm.enabled ? llmProvider : demoProvider;
    // Read the latest state at send time (not the render-time snapshot).
    const reply = await provider.answer(useWorkspace.getState() as unknown as S, q, pageContext);
    add({ id: uid("m"), role: "assistant", text: reply.text, at: new Date().toISOString(), sources: reply.sources, actions: reply.actions, followUps: reply.followUps, engine: reply.engine });
    setThinking(false);
  }

  // A prompt queued from elsewhere (command palette, dashboard buttons).
  useEffect(() => {
    if (pending !== null) {
      const p = consumePending();
      // Deferred so the send runs as a callback, not synchronously inside the effect.
      queueMicrotask(() => (p ? void send(p) : inputRef.current?.focus()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const suggestions = SUGGESTIONS[user.persona ?? "intern"];
  const closeOnNavigate = variant === "panel" && typeof window !== "undefined" && window.innerWidth < 1024 ? onClose : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="assistant-chat">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.6_0.17_274)] to-[oklch(0.52_0.2_300)] text-white">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">TBI ONE Assistant</p>
          <p className="truncate text-[11px] text-muted-foreground">{mode === "llm" && llm.enabled ? `Grounded answers phrased by ${llm.model}` : "Demo engine · answers from workspace data only"}</p>
        </div>
        {messages.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={clear} aria-label="Clear conversation">
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear conversation</TooltipContent>
          </Tooltip>
        )}
        {variant === "panel" && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open AI workspace"
                  onClick={() => {
                    router.push("/assistant");
                    onClose?.();
                  }}
                >
                  <Maximize2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open AI workspace</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close assistant">
              <X />
            </Button>
          </>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className={cn("flex flex-col", variant === "page" ? "mx-auto max-w-2xl pt-6" : "pt-2")}>
            <div className="ai-surface rounded-xl border p-4">
              <p className="text-sm font-semibold">Hi {user.firstName}, how can I help?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                I answer from the projects, meetings, messages, documents and people you have access to, and show my sources. I propose actions, but nothing changes until you confirm.
              </p>
            </div>
            <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Try asking</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-accent" data-testid="assistant-suggestion">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={cn("flex flex-col gap-5", variant === "page" && "mx-auto max-w-3xl")}>
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.text}</p>
                </li>
              ) : (
                <li key={m.id} className="flex flex-col" data-testid="assistant-answer">
                  <div className="mb-1.5 flex items-center gap-2">
                    <AiBadge engine={m.engine ?? "demo"} />
                    <span className="text-[11px] text-muted-foreground">{formatDate(m.at, "HH:mm")}</span>
                  </div>
                  <RichText text={m.text} className="text-foreground/90" />
                  {m.sources && m.sources.length > 0 && <Sources sources={m.sources} onNavigate={closeOnNavigate} />}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {m.actions.filter((a) => a.action.kind !== "navigate").map((a) => (
                        <ActionCard key={a.id} msg={m} act={a} onNavigate={closeOnNavigate} />
                      ))}
                      <div className="flex flex-wrap gap-1.5">
                        {m.actions.filter((a) => a.action.kind === "navigate").map((a) => (
                          <ActionCard key={a.id} msg={m} act={a} onNavigate={closeOnNavigate} />
                        ))}
                      </div>
                    </div>
                  )}
                  {m.followUps && m.followUps.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.followUps.map((f) => (
                        <button key={f} type="button" onClick={() => send(f)} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ),
            )}
            {thinking && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Assistant is thinking">
                <Sparkles className="size-4 animate-pulse text-ai" aria-hidden />
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-ai/70 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ai/70 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ai/70" />
                </span>
                Searching your workspace…
              </li>
            )}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        {pageContext && (
          <p className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            <span className="truncate">Context: {pageContext.label}</span>
          </p>
        )}
        <div className={cn("relative rounded-xl border bg-card shadow-card focus-within:border-ring/50 focus-within:ring-3 focus-within:ring-ring/20", variant === "page" && "mx-auto max-w-3xl")}>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about your work…"
            rows={2}
            className="min-h-0 resize-none border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0"
            aria-label="Message the assistant"
            data-testid="assistant-input"
          />
          <Button type="submit" size="icon-sm" className="absolute right-2 bottom-2" disabled={!input.trim() || thinking} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Simulated AI on fictional data. Always check important answers.</p>
      </form>
    </div>
  );
}
