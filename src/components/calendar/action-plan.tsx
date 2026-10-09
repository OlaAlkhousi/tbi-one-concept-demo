"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  CircleDot,
  FolderKanban,
  GitBranch,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Quote,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { generateActionPlan, type Suggestion } from "@/lib/ai/meeting-actions";
import { employees } from "@/lib/data/people";
import { canViewProjectId } from "@/lib/permissions";
import { employeeById, projectById, repoById, visibleProjects, type S } from "@/lib/selectors";
import { formatDate, relativeDue } from "@/lib/time";
import type { ID, ISODate, Meeting, Priority, Project, Task, TaskDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "@/components/common/hooks";
import { AiBadge, Panel, ProgressBar } from "@/components/common/layout";
import { Pill, PriorityBadge, PriorityDot, TaskStatusBadge } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Field, NONE } from "@/components/common/field";

/** The reviewable version of one suggestion. Nothing is stored until the user confirms. */
interface Draft {
  include: boolean;
  title: string;
  description: string;
  projectId?: ID;
  assigneeId: ID;
  priority: Priority;
  due: string;
  createIssue: boolean;
  linkExisting: boolean;
}

type Phase = "analysing" | "review" | "created";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ANALYSIS_STEPS = ["Matching owners to skills and workload", "Checking deadlines against the project plan", "Looking for duplicate tasks and GitHub issues"];

function initialDraft(sg: Suggestion, s: S): Draft {
  const hasRepo = Boolean(projectById(s, sg.projectId)?.repoIds.length);
  return {
    include: !sg.duplicate,
    title: sg.title,
    description: sg.description,
    projectId: sg.projectId,
    assigneeId: sg.ownerId,
    priority: sg.priority,
    due: sg.due,
    createIssue: hasRepo && !sg.linkIssue,
    linkExisting: Boolean(sg.linkIssue),
  };
}

function titleError(d: Draft): string | undefined {
  if (!d.include) return undefined;
  const len = d.title.trim().length;
  if (len < 3) return "Give the task a title of at least 3 characters.";
  if (len > 120) return "Keep the title under 120 characters.";
  return undefined;
}

/** Only link when the task stays in the project the issue belongs to. */
const linksIssue = (d: Draft, sg: Suggestion) => Boolean(d.linkExisting && sg.linkIssue && d.projectId === sg.projectId);
const hrefFor = (kind: "task" | "issue", id: ID) => (kind === "task" ? `/tasks?task=${id}` : `/github?issue=${id}`);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ─── The flow ────────────────────────────────────────────────────────────────

export function ActionPlan({ meeting, today, onClose }: { meeting: Meeting; today: ISODate; onClose: () => void }) {
  const s = useS();
  const [phase, setPhase] = useState<Phase>("analysing");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [createdIds, setCreatedIds] = useState<ID[]>([]);
  const rootRef = useRef<HTMLElement>(null);

  // A short, honest "analysing" moment: the demo engine is deterministic and instant.
  useEffect(() => {
    if (phase !== "analysing") return;
    const t = setTimeout(() => {
      const state = useWorkspace.getState() as unknown as S;
      const list = generateActionPlan(state, meeting.id, today);
      setSuggestions(list);
      setDrafts(list.map((sg) => initialDraft(sg, state)));
      setPhase("review");
    }, 900);
    return () => clearTimeout(t);
  }, [phase, meeting.id, today]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [phase]);

  const update = (i: number, patch: Partial<Draft>) => setDrafts((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const errors = drafts.map(titleError);
  const selected = drafts.map((d, i) => ({ d, sg: suggestions[i] })).filter((x) => x.d.include);
  const linked = selected.filter((x) => linksIssue(x.d, x.sg)).length;
  const newIssues = selected.filter((x) => !linksIssue(x.d, x.sg) && x.d.createIssue && Boolean(projectById(s, x.d.projectId)?.repoIds.length)).length;

  function create() {
    if (selected.length === 0) return;
    const firstInvalid = errors.findIndex(Boolean);
    if (firstInvalid !== -1) {
      setShowErrors(true);
      const field = document.getElementById(`${suggestions[firstInvalid].id}-title`);
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: "center" });
      return;
    }
    const payload: TaskDraft[] = selected.map(({ d, sg }) => {
      const link = linksIssue(d, sg) ? sg.linkIssue!.id : undefined;
      return {
        title: d.title.trim(),
        description: d.description.trim(),
        projectId: d.projectId,
        assigneeId: d.assigneeId,
        priority: d.priority,
        due: d.due || undefined,
        source: { type: "meeting", id: meeting.id },
        alsoCreateIssue: !link && d.createIssue && Boolean(projectById(s, d.projectId)?.repoIds.length),
        linkIssueId: link,
      };
    });
    const tasks = useWorkspace.getState().createActionPlan(meeting.id, payload);
    setCreatedIds(tasks.map((t) => t.id));
    setPhase("created");
    const parts = [newIssues && `${plural(newIssues, "simulated GitHub issue")} opened`, linked && `${linked} linked to an existing issue`].filter(Boolean);
    toast.success(`${plural(tasks.length, "task")} created`, { description: parts.length ? `${parts.join(", ")}. Nothing was sent to GitHub.` : `From “${meeting.title}”.` });
  }

  if (phase === "analysing") {
    return (
      <section ref={rootRef} className="ai-surface scroll-mt-20 rounded-xl border p-4 shadow-card animate-in fade-in slide-in-from-bottom-2 sm:p-5" aria-busy="true" aria-live="polite" data-testid="plan-analysing">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai ring-1 ring-ai/20 ring-inset">
            <Sparkles className="size-4 animate-pulse" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Analysing summary…</p>
            <p className="text-xs text-muted-foreground">
              Reading {plural(meeting.actionPoints?.length ?? 0, "action point")} from “{meeting.title}”
            </p>
          </div>
          <AiBadge />
        </div>
        <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
          {ANALYSIS_STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1 fill-mode-both" style={{ animationDelay: `${i * 220}ms` }}>
              <Loader2 className="size-3.5 animate-spin text-ai" aria-hidden />
              {step}
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2.5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border bg-card/60 p-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2.5 h-8 w-full" />
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-7" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (phase === "created") {
    return <PlanCreated ref={rootRef} meeting={meeting} taskIds={createdIds} today={today} onDone={onClose} />;
  }

  return (
    <section ref={rootRef} className="scroll-mt-20 rounded-xl border bg-card shadow-card animate-in fade-in slide-in-from-bottom-2" aria-labelledby="plan-title" data-testid="action-plan">
      <header className="ai-surface flex items-start justify-between gap-3 rounded-t-xl border-b border-ai/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="plan-title" className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-ai" aria-hidden /> Suggested action plan
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plural(suggestions.length, "task")} from the meeting&apos;s action points. Check owners, priorities and deadlines. Nothing is created until you confirm.
          </p>
        </div>
        <AiBadge className="shrink-0" />
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        {suggestions.map((sg, i) => (
          <SuggestionCard key={sg.id} index={i} total={suggestions.length} sg={sg} draft={drafts[i]} error={showErrors ? errors[i] : undefined} meeting={meeting} s={s} today={today} onChange={(p) => update(i, p)} />
        ))}
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-xl border-t bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground">
            {selected.length} of {suggestions.length}
          </span>{" "}
          selected
          {newIssues > 0 && ` · ${plural(newIssues, "new simulated issue")}`}
          {linked > 0 && ` · ${linked} linked to an existing issue`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} disabled={selected.length === 0} data-testid="create-plan">
            <Check /> Create {plural(selected.length, "task")}
          </Button>
        </div>
      </footer>
    </section>
  );
}

// ─── One suggestion ──────────────────────────────────────────────────────────

function Why({ children, changed, onReset }: { children: React.ReactNode; changed: boolean; onReset: () => void }) {
  if (changed)
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>Changed by you.</span>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 rounded font-medium text-foreground/80 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          <RotateCcw className="size-3" aria-hidden /> Use suggestion
        </button>
      </p>
    );
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
      <Sparkles className="mt-px size-3 shrink-0 text-ai" aria-hidden />
      <span>
        <span className="sr-only">Why: </span>
        {children}
      </span>
    </p>
  );
}

function SuggestionCard({
  index,
  total,
  sg,
  draft,
  error,
  meeting,
  s,
  today,
  onChange,
}: {
  index: number;
  total: number;
  sg: Suggestion;
  draft: Draft;
  error?: string;
  meeting: Meeting;
  s: S;
  today: ISODate;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = sg.id;
  const ap = meeting.actionPoints?.find((a) => a.id === sg.actionPointId);
  const raisedBy = employeeById(ap?.mentionedBy);
  const projects = visibleProjects(s);
  const project = projects.find((p) => p.id === draft.projectId);
  const repo = repoById(project?.repoIds[0]);
  const people = ownerOptions(project, meeting, s, sg.ownerId);
  const canLink = Boolean(sg.linkIssue) && draft.projectId === sg.projectId;
  const edited = draft.title !== sg.title || draft.description !== sg.description || draft.assigneeId !== sg.ownerId || draft.priority !== sg.priority || draft.due !== sg.due || draft.projectId !== sg.projectId;
  const dueHint = draft.due ? relativeDue(draft.due, today) : undefined;
  const related = sg.related.filter((r) => r.id !== sg.linkIssue?.id);

  function changeProject(value: string) {
    const next = value === NONE ? undefined : projects.find((p) => p.id === value);
    const team = ownerOptions(next, meeting, s, sg.ownerId);
    const keep = team.some((e) => e.id === draft.assigneeId);
    const fallback = team.find((e) => e.id === sg.ownerId) ?? team.find((e) => e.id === s.currentUserId) ?? team[0];
    const back = next?.id === sg.projectId;
    onChange({
      projectId: next?.id,
      assigneeId: keep ? draft.assigneeId : (fallback?.id ?? s.currentUserId),
      // Going back to the suggested project restores the suggested GitHub choice.
      createIssue: back ? initialDraft(sg, s).createIssue : draft.createIssue && Boolean(next?.repoIds.length),
      linkExisting: back ? Boolean(sg.linkIssue) : draft.linkExisting,
    });
  }

  return (
    <article
      data-testid="plan-suggestion"
      data-included={draft.include}
      aria-label={`Suggested task ${index + 1} of ${total}`}
      className={cn("rounded-lg border transition-colors", draft.include ? "bg-card" : "bg-muted/30")}
    >
      <div className="flex gap-3 p-3 sm:p-4">
        <Checkbox
          id={`${id}-include`}
          checked={draft.include}
          onCheckedChange={(c) => onChange({ include: c === true })}
          aria-label={`Include task ${index + 1} in the plan`}
          data-testid="suggestion-include"
          className="mt-0.5"
        />
        <div className="@container min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <label htmlFor={`${id}-include`} className="cursor-pointer font-medium text-foreground/80">
              Task {index + 1} of {total}
            </label>
            {ap && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>·</span>
                <PersonAvatar person={raisedBy} size="xs" />
                Raised by {raisedBy?.firstName ?? "someone"} at {ap.timestamp}
              </span>
            )}
            {!draft.include && <Pill>Not included</Pill>}
            {draft.include && edited && <Pill tone="info">Edited</Pill>}
            <span className="ml-auto tabular" title="How sure the simulated engine is about this suggestion">
              {Math.round(sg.confidence * 100)}% confidence
            </span>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor={`${id}-title`} className="sr-only">
              Title of task {index + 1}
            </label>
            <Input
              id={`${id}-title`}
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              data-testid="suggestion-title"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-title-error` : undefined}
              className={cn("h-9 text-sm font-medium", !draft.include && "text-muted-foreground")}
            />
            {error && (
              <p id={`${id}-title-error`} role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          {sg.duplicate && (
            <div className="flex gap-2.5 rounded-lg bg-warning-soft px-3 py-2.5 text-xs ring-1 ring-warning/25 ring-inset" data-testid="suggestion-duplicate">
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  Possible duplicate of{" "}
                  <Link href={hrefFor(sg.duplicate.kind, sg.duplicate.id)} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-warning">
                    {sg.duplicate.label}
                    <ArrowUpRight className="ml-0.5 inline size-3 align-[-2px]" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </Link>{" "}
                  <span className="font-normal text-muted-foreground">· {Math.round(sg.duplicate.score * 100)}% overlap</span>
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {draft.include ? "Included anyway. Make sure this is different work, or the team plans it twice." : "Left out so the same work isn't planned twice. Tick the box if this is different work."}
                </p>
              </div>
            </div>
          )}

          {draft.include && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {ap && (
                <p className="flex gap-1.5 text-xs text-muted-foreground">
                  <Quote className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span className="line-clamp-2 italic">{ap.text}</span>
                </p>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  aria-expanded={open}
                  aria-controls={`${id}-desc-wrap`}
                  className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} aria-hidden />
                  {open ? "Hide description" : "Edit description"}
                </button>
                {open && (
                  <div id={`${id}-desc-wrap`} className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label htmlFor={`${id}-desc`} className="sr-only">
                      Description of task {index + 1}
                    </label>
                    <Textarea id={`${id}-desc`} rows={4} value={draft.description} onChange={(e) => onChange({ description: e.target.value })} className="text-sm" />
                  </div>
                )}
              </div>

              <div className="grid gap-x-3 gap-y-3 @lg:grid-cols-2 @4xl:grid-cols-4">
                <Field id={`${id}-project`} label="Project">
                  <Select value={draft.projectId ?? NONE} onValueChange={changeProject}>
                    <SelectTrigger id={`${id}-project`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No project (personal)</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Why changed={draft.projectId !== sg.projectId} onReset={() => changeProject(sg.projectId ?? NONE)}>
                    {sg.projectId ? "The project this meeting belongs to." : "This meeting has no project."}
                  </Why>
                </Field>

                <Field id={`${id}-owner`} label="Owner">
                  <Select value={draft.assigneeId} onValueChange={(v) => onChange({ assigneeId: v })}>
                    <SelectTrigger id={`${id}-owner`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <PersonAvatar person={p} size="xs" className="-my-0.5" />
                          {p.name}
                          {p.id === s.currentUserId ? " (you)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Why changed={draft.assigneeId !== sg.ownerId} onReset={() => onChange({ assigneeId: sg.ownerId })}>
                    {sg.ownerReason}
                  </Why>
                </Field>

                <Field id={`${id}-priority`} label="Priority">
                  <Select value={draft.priority} onValueChange={(v) => onChange({ priority: v as Priority })}>
                    <SelectTrigger id={`${id}-priority`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <PriorityDot priority={p.value} />
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Why changed={draft.priority !== sg.priority} onReset={() => onChange({ priority: sg.priority })}>
                    {sg.priorityReason}
                  </Why>
                </Field>

                <Field id={`${id}-due`} label={dueHint ? <>Deadline · <span className={cn(dueHint.tone === "overdue" && "text-danger")}>{dueHint.label.replace(/^Due /, "")}</span></> : "Deadline"}>
                  <Input id={`${id}-due`} type="date" value={draft.due} onChange={(e) => onChange({ due: e.target.value })} className="tabular" />
                  <Why changed={draft.due !== sg.due} onReset={() => onChange({ due: sg.due })}>
                    {sg.dueReason}
                  </Why>
                </Field>
              </div>

              <div className="divide-y rounded-lg border bg-muted/30">
                {canLink && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span id={`${id}-link-label`} className="flex min-w-0 items-start gap-2 text-xs">
                      <Link2 className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        Link to existing issue <span className="font-medium">{sg.linkIssue!.label}</span> instead of creating a new one
                        <span className="block text-[11px] text-muted-foreground">Open, related and nobody owns it yet.</span>
                      </span>
                    </span>
                    <Switch
                      checked={draft.linkExisting}
                      onCheckedChange={(c) => onChange({ linkExisting: c, createIssue: c ? false : draft.createIssue })}
                      aria-labelledby={`${id}-link-label`}
                      data-testid="suggestion-link-issue"
                    />
                  </div>
                )}
                <label className={cn("flex items-center justify-between gap-3 px-3 py-2.5", !repo && "opacity-60")}>
                  <span className="flex min-w-0 items-start gap-2 text-xs">
                    <GitBranch className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      Create simulated GitHub issue
                      {repo ? (
                        <>
                          {" "}
                          in <span className="font-mono text-[11px]">{repo.fullName}</span>
                        </>
                      ) : (
                        <span className="block text-[11px] text-muted-foreground">This project has no repository.</span>
                      )}
                    </span>
                  </span>
                  <Switch
                    checked={Boolean(repo) && draft.createIssue && !(canLink && draft.linkExisting)}
                    disabled={!repo}
                    onCheckedChange={(c) => onChange({ createIssue: c, linkExisting: c ? false : draft.linkExisting })}
                    aria-label="Create simulated GitHub issue"
                    data-testid="suggestion-issue"
                  />
                </label>
              </div>

              {related.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Related:</span>
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={hrefFor(r.kind, r.id)}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-5 max-w-full min-w-0 items-center gap-1 rounded-full border bg-card px-2 text-[11px] text-muted-foreground outline-none transition hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {r.kind === "task" ? <CheckSquare className="size-3 shrink-0" aria-hidden /> : <CircleDot className="size-3 shrink-0" aria-hidden />}
                      <span className="truncate">{r.label}</span>
                      <span className="sr-only">({r.kind}, opens in a new tab)</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** Project team members; without a project, the meeting's participants. Always includes the suggested owner. */
function ownerOptions(project: Project | undefined, meeting: Meeting, s: S, suggested: ID) {
  const ids = project ? project.teamIds : [...meeting.participantIds, s.currentUserId];
  return employees.filter((e) => ids.includes(e.id) || (!project && e.id === suggested));
}

// ─── After confirming ────────────────────────────────────────────────────────

function TaskRow({ task, s, today, showStatus = false }: { task: Task; s: S; today: ISODate; showStatus?: boolean }) {
  const owner = employeeById(task.assigneeId);
  const issue = task.githubIssueId ? s.issues.find((i) => i.id === task.githubIssueId) : undefined;
  const repo = issue ? repoById(issue.repoId) : undefined;
  const due = task.due && task.status !== "done" ? relativeDue(task.due, today) : undefined;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3" data-testid="follow-up-task">
      {showStatus ? <TaskStatusBadge status={task.status} /> : <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />}
      <Link href={`/tasks?task=${task.id}`} className={cn("min-w-0 flex-1 basis-48 truncate text-sm font-medium underline-offset-4 hover:underline", task.status === "done" && "text-muted-foreground line-through")}>
        {task.title}
      </Link>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <PersonAvatar person={owner} size="xs" />
        {task.assigneeId === s.currentUserId ? "You" : owner?.firstName}
      </span>
      <PriorityBadge priority={task.priority} />
      {due && <span className={cn("text-[11px] font-medium tabular", due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "text-muted-foreground")}>{due.label}</span>}
      {issue && repo && (
        <Link
          href={`/github?issue=${issue.id}`}
          className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 transition hover:bg-foreground/10"
          title={issue.createdInDemo ? "Simulated issue created in this demo, never pushed to GitHub" : "Existing simulated issue"}
        >
          <GitBranch className="size-3" aria-hidden />
          {repo.name}#{issue.number}
          <span className="sr-only">{issue.createdInDemo ? " (new simulated issue)" : " (linked existing issue)"}</span>
        </Link>
      )}
    </li>
  );
}

function PlanCreated({ ref, meeting, taskIds, today, onDone }: { ref: React.Ref<HTMLElement>; meeting: Meeting; taskIds: ID[]; today: ISODate; onDone: () => void }) {
  const s = useS();
  const tasks = taskIds.map((id) => s.tasks.find((t) => t.id === id)).filter((t): t is Task => Boolean(t));
  const project = projectById(s, meeting.projectId);
  const withIssue = tasks.filter((t) => t.githubIssueId).length;
  const owners = new Set(tasks.map((t) => t.assigneeId).filter((id) => id !== s.currentUserId)).size;
  return (
    <section ref={ref} className="scroll-mt-20 overflow-hidden rounded-xl border bg-card shadow-card animate-in fade-in slide-in-from-bottom-2" data-testid="plan-created" aria-labelledby="plan-created-title">
      <div className="flex items-start gap-3 border-b bg-success-soft/40 px-4 py-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-success/20 ring-inset animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="plan-created-title" className="text-sm font-semibold">
            Action plan created: {plural(tasks.length, "task")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {owners > 0 ? `${plural(owners, "owner")} got a TBI ONE notification. ` : ""}
            {withIssue > 0 ? `${withIssue} task${withIssue === 1 ? " is" : "s are"} linked to a simulated GitHub issue; nothing was sent to GitHub.` : "No GitHub issues were created."}
          </p>
        </div>
      </div>
      <ul className="divide-y">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} s={s} today={today} />
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button asChild size="sm" variant="outline">
          <Link href="/tasks">
            <CheckSquare /> View in My Tasks
          </Link>
        </Button>
        {project && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}`}>
              <FolderKanban /> View project
            </Link>
          </Button>
        )}
        {withIssue > 0 && (
          <Button asChild size="sm" variant="outline">
            <Link href="/github">
              <GitBranch /> View GitHub
            </Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onDone}>
          Done
        </Button>
      </div>
    </section>
  );
}

/** Tasks that came out of this meeting: the action plan, plus follow-ups added later. */
export function FollowUpTasks({ meeting, today }: { meeting: Meeting; today: ISODate }) {
  const s = useS();
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const order = (id: ID) => {
    const i = meeting.followUpTaskIds.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const tasks = s.tasks
    .filter((t) => (meeting.followUpTaskIds.includes(t.id) || (t.source.type === "meeting" && t.source.id === meeting.id)) && canViewProjectId(s, s.currentUserId, t.projectId))
    .sort((a, b) => order(a.id) - order(b.id) || a.createdAt.localeCompare(b.createdAt));
  if (!meeting.actionPlanCreatedAt && tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <Panel
      id="follow-up"
      title="Follow-up tasks"
      icon={ListChecks}
      description={meeting.actionPlanCreatedAt ? `Action plan created ${formatDate(meeting.actionPlanCreatedAt, "EEE d MMM 'at' HH:mm")}` : "Tasks linked to this meeting"}
      action={
        <span className="text-xs text-muted-foreground tabular">
          {done}/{tasks.length} done
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="px-4 pt-3">
        <ProgressBar value={pct} tone={pct === 100 ? "success" : "primary"} label="Follow-up tasks done" />
      </div>
      <ul className="divide-y" data-testid="follow-up-tasks">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} s={s} today={today} showStatus />
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">Left something out? A follow-up you add here is linked to this meeting.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openTaskDialog({ initial: { projectId: meeting.projectId, source: { type: "meeting", id: meeting.id }, description: `Follow-up from “${meeting.title}”.` } })}
        >
          <Plus /> Add follow-up task
        </Button>
      </div>
    </Panel>
  );
}
