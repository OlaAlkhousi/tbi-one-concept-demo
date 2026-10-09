"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDot,
  FolderKanban,
  Lightbulb,
  ListChecks,
  ListPlus,
  LoaderCircle,
  MessageSquareText,
  Network,
  Puzzle,
  RotateCcw,
  Scale,
  Sparkles,
  Target,
  Timer,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, ProjectStatusBadge } from "@/components/common/badges";
import { AiBadge, EmptyState, Panel } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { projectInsights, similarProjects, type Evidence, type Insight } from "@/lib/ai/insights";
import { plural } from "@/lib/ai/text";
import { canViewProject } from "@/lib/permissions";
import { employeeById, type S } from "@/lib/selectors";
import type { Project, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { ProjectMonogram } from "./project-visuals";

const PROMPT = "What improvements do you recommend for this project?";
/** Long enough to read what is being considered, short enough not to feel slow. */
const ANALYSE_MS = 900;

const EVIDENCE_ICON: Record<Evidence["kind"], LucideIcon> = {
  objective: Target,
  risk: TriangleAlert,
  task: ListChecks,
  issue: CircleDot,
  decision: Scale,
  project: FolderKanban,
  feature: Puzzle,
  meeting: CalendarDays,
};

const impactTone = { high: "ai", medium: "info", low: "neutral" } as const;
const effortTone = { small: "success", medium: "neutral", large: "warning" } as const;

type Phase = "idle" | "analysing" | "done";

export function InsightsTab({ s, project: p, today }: { s: S; project: Project; today: string }) {
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const issueCount = s.issues.filter((i) => p.repoIds.includes(i.repoId)).length;
  const otherCount = s.projects.filter((x) => x.id !== p.id && x.visibility === "internal").length;
  const sources: { icon: LucideIcon; label: string }[] = [
    { icon: Target, label: plural(p.objectives.length, "objective") },
    { icon: Puzzle, label: plural(p.features.length, "feature") },
    { icon: ListChecks, label: plural(s.tasks.filter((t) => t.projectId === p.id).length, "task") },
    { icon: Scale, label: plural(p.decisions.length, "decision") },
    { icon: TriangleAlert, label: plural(p.risks.length, "risk") },
    { icon: CircleDot, label: plural(issueCount, "GitHub issue") },
    { icon: FolderKanban, label: plural(otherCount, "other project") },
  ];

  function generate() {
    timers.current.splice(0).forEach((t) => window.clearTimeout(t));
    // Snapshot now, so the cards don't reshuffle when a suggested task gets created.
    const result = projectInsights(s, p.id, today);
    setPhase("analysing");
    setStep(0);
    setJustCreated(null);
    const stepMs = ANALYSE_MS / sources.length;
    sources.forEach((_, i) => timers.current.push(window.setTimeout(() => setStep(i + 1), Math.round(stepMs * (i + 0.8)))));
    timers.current.push(
      window.setTimeout(() => {
        setInsights(result);
        setPhase("done");
      }, ANALYSE_MS),
    );
  }

  function convert(insight: Insight) {
    openTaskDialog({
      initial: {
        title: insight.task.title,
        description: `${insight.task.description}\n\nWhy: ${insight.why}`,
        projectId: p.id,
        priority: insight.task.priority,
        assigneeId: s.currentUserId,
        source: { type: "insight", id: insight.id },
      },
      onCreated: () => setJustCreated(insight.id),
    });
  }

  // Derived from the store, so "Task created" survives navigating away and back.
  const taskFor = (insightId: string): Task | undefined => s.tasks.find((t) => t.source.type === "insight" && t.source.id === insightId);

  return (
    <div className="space-y-4">
      <section className="ai-surface overflow-hidden rounded-xl border shadow-card" aria-labelledby="insights-heading" data-testid="insights-panel">
        <header className="flex items-center justify-between gap-3 border-b border-ai/10 px-4 py-3">
          <h2 id="insights-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-ai" aria-hidden /> AI Insights
          </h2>
          <AiBadge />
        </header>

        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <PersonAvatar id={s.currentUserId} size="sm" />
            <p className="rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm shadow-card">{PROMPT}</p>
          </div>

          {phase === "idle" && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-ai/25 bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm text-muted-foreground">
                The assistant reviews {p.name}&apos;s objectives, features, tasks, decisions, risks and issues, and compares them with other projects. Each suggestion shows the records it is based on.
              </p>
              <Button onClick={generate} data-testid="generate-insights" className="shrink-0 bg-gradient-to-r from-primary to-[oklch(0.52_0.2_292)] text-primary-foreground">
                <Sparkles /> Generate insights
              </Button>
            </div>
          )}

          {phase === "analysing" && (
            <div role="status" aria-live="polite" className="rounded-xl border border-ai/15 bg-card/70 p-4" data-testid="insights-analysing">
              <p className="flex items-center gap-2 text-sm font-medium">
                <LoaderCircle className="size-4 animate-spin text-ai" aria-hidden /> Analysing {p.name}…
              </p>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {sources.map((src, i) => {
                  const done = i < step;
                  const Icon = done ? Check : src.icon;
                  return (
                    <li key={src.label} className={cn("flex items-center gap-2 text-xs transition-colors", done ? "text-foreground" : "text-muted-foreground/70")}>
                      <Icon className={cn("size-3.5 shrink-0", done ? "text-success" : "")} aria-hidden />
                      Reading {src.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {insights.length ? `${plural(insights.length, "recommendation")}, highest impact first.` : "No recommendations."}
                </p>
                <Button size="sm" variant="ghost" onClick={generate}>
                  <RotateCcw /> Regenerate
                </Button>
              </div>
              {insights.length === 0 ? (
                <EmptyState icon={Lightbulb} title="Nothing to improve right now" description="No rule found evidence for a recommendation. Risks, objectives and open work all look covered." className="bg-card/60" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {insights.map((insight, i) => (
                    <InsightCard key={insight.id} insight={insight} index={i} task={taskFor(insight.id)} highlight={justCreated === insight.id} onConvert={() => convert(insight)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-ai/10 px-4 py-2.5 text-[11px] text-muted-foreground">Simulated AI — rule-based analysis of project records. Every suggestion lists its evidence.</footer>
      </section>

      <SimilarProjects s={s} project={p} />
    </div>
  );
}

function InsightCard({ insight, index, task, highlight, onConvert }: { insight: Insight; index: number; task?: Task; highlight: boolean; onConvert: () => void }) {
  return (
    <article
      data-testid="insight-card"
      className={cn("flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card duration-300 animate-in fill-mode-both fade-in slide-in-from-bottom-1", highlight && "ring-2 ring-success/40")}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <h3 className="text-sm leading-snug font-semibold">{insight.title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone={impactTone[insight.impact]} icon={Zap}>
          <span className="capitalize">{insight.impact}</span> impact
        </Pill>
        <Pill tone={effortTone[insight.effort]} icon={Timer}>
          <span className="capitalize">{insight.effort}</span> effort
        </Pill>
      </div>

      <h4 className="mt-3 text-xs font-medium text-muted-foreground">Why this could help</h4>
      <p className="mt-1 text-sm leading-relaxed">{insight.why}</p>

      <h4 className="mt-3 text-xs font-medium text-muted-foreground">Evidence</h4>
      <ul className="mt-1.5 space-y-1.5" aria-label={`Evidence for: ${insight.title}`}>
        {insight.evidence.map((e, i) => {
          const Icon = EVIDENCE_ICON[e.kind];
          return (
            <li key={`${e.kind}-${i}`} className="flex items-start gap-2 text-xs">
              <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" title={e.kind}>
                <Icon className="size-3" aria-hidden />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="sr-only">{e.kind}: </span>
                {e.href ? (
                  <Link href={e.href} className="text-foreground/90 underline decoration-border underline-offset-4 hover:decoration-foreground">
                    {e.label}
                  </Link>
                ) : (
                  <span className="text-foreground/80">{e.label}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="min-h-4 flex-1" aria-hidden />
      <div className="border-t pt-3">
        {task ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-testid="insight-task-created">
            <span className="font-medium text-success">Task created ✓</span>
            <Link href={`/tasks?task=${task.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
              View task <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </p>
        ) : (
          <Button size="sm" variant="outline" onClick={onConvert} data-testid="insight-create-task">
            <ListPlus /> Convert to task
          </Button>
        )}
      </div>
    </article>
  );
}

/** Cross-project knowledge discovery. Restricted projects you can't open are left out. */
function SimilarProjects({ s, project: p }: { s: S; project: Project }) {
  const ask = useWorkspace((x) => x.askAssistant);
  const similar = similarProjects(s, p)
    .filter((x) => canViewProject(s, s.currentUserId, x.project))
    .slice(0, 4);
  if (similar.length === 0) return null;
  return (
    <Panel title="Similar projects" icon={Network} description="Projects that share technologies with this one. Their teams may already have solved your next problem." id="similar-projects">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {similar.map(({ project: x, shared }) => {
          const owner = employeeById(x.ownerId);
          return (
            <li key={x.id} className="flex min-w-0 flex-col rounded-lg border p-3">
              <div className="flex items-start gap-2.5">
                <ProjectMonogram project={x} className="size-8 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${x.id}`} className="block truncate text-sm font-medium underline-offset-4 hover:underline">
                    {x.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Owner {owner?.name}</p>
                </div>
              </div>
              <div className="mt-2">
                <ProjectStatusBadge status={x.status} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Shares</p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {shared.map((t) => (
                  <li key={t} className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-[11px]">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="min-h-3 flex-1" aria-hidden />
              <Button size="xs" variant="ghost" className="mt-2 self-start" onClick={() => ask(`What can ${p.name} learn from ${x.name}?`)}>
                <MessageSquareText /> Ask the assistant
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
