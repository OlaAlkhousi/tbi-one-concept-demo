"use client";

import { toast } from "sonner";
import { CalendarDays, CircleDot, Inbox, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";
import { Pill, taskStatusLabel } from "@/components/common/badges";
import { repoById, type S } from "@/lib/selectors";
import { formatDate, relativeDue } from "@/lib/time";
import type { ISODate, Project, SourceRef, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

export function ProjectChip({ project, className }: { project?: Project; className?: string }) {
  if (!project) return null;
  return (
    <span className={cn("inline-flex h-5 max-w-[14rem] min-w-0 items-center gap-1.5 rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground", className)}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: `oklch(0.62 0.13 ${project.hue})` }} aria-hidden />
      <span className="truncate">{project.name}</span>
    </span>
  );
}

const SOURCE_CHIP: Partial<Record<SourceRef["type"], { label: string; icon: LucideIcon; tone: "info" | "ai" }>> = {
  meeting: { label: "From meeting", icon: CalendarDays, tone: "info" },
  message: { label: "From message", icon: Inbox, tone: "info" },
  insight: { label: "From AI insight", icon: Lightbulb, tone: "ai" },
  assistant: { label: "From assistant", icon: Sparkles, tone: "ai" },
};

export function SourceChip({ source }: { source: SourceRef }) {
  const meta = SOURCE_CHIP[source.type];
  if (!meta) return null;
  return (
    <Pill tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Pill>
  );
}

export function githubIssueFor(s: S, task: Task) {
  const issue = task.githubIssueId ? s.issues.find((i) => i.id === task.githubIssueId) : undefined;
  return issue ? { issue, repo: repoById(issue.repoId) } : undefined;
}

export function GithubChip({ s, task }: { s: S; task: Task }) {
  const gh = githubIssueFor(s, task);
  if (!gh) return null;
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-foreground/[0.06] px-2 font-mono text-[11px] text-foreground/80" title={`Simulated GitHub issue: ${gh.issue.title} (${gh.issue.state})`}>
      <CircleDot className={cn("size-3", gh.issue.state === "open" ? "text-success" : "text-muted-foreground")} aria-hidden />
      {gh.repo?.name ?? "repo"}#{gh.issue.number}
    </span>
  );
}

export function DueLabel({ task, today, className }: { task: Task; today: ISODate; className?: string }) {
  if (!task.due) return null;
  if (task.status === "done") return <span className={cn("shrink-0 text-[11px] whitespace-nowrap text-muted-foreground", className)}>{formatDate(task.due, "d MMM")}</span>;
  const d = relativeDue(task.due, today);
  return (
    <span className={cn("shrink-0 text-[11px] font-medium whitespace-nowrap", d.tone === "overdue" ? "text-danger" : d.tone === "soon" ? "text-warning" : "text-muted-foreground", className)}>
      {d.label}
    </span>
  );
}

/** Completes or reopens a task, with an undo that also reopens a simulated issue it closed. */
export function toggleTaskDone(task: Task, done: boolean) {
  const ws = useWorkspace.getState();
  const prev = task.status;
  const issue = task.githubIssueId ? ws.issues.find((i) => i.id === task.githubIssueId) : undefined;
  const closesIssue = done && issue?.state === "open";
  ws.setTaskStatus(task.id, done ? "done" : "todo");
  toast.success(done ? "Task completed" : "Task reopened", {
    description: closesIssue ? `${task.title} · its simulated GitHub issue was closed too` : task.title,
    action: {
      label: "Undo",
      onClick: () => {
        const st = useWorkspace.getState();
        st.setTaskStatus(task.id, prev);
        if (closesIssue && issue) st.setIssueState(issue.id, "open");
      },
    },
  });
}

export function moveTask(task: Task, status: TaskStatus) {
  if (task.status === status) return;
  if (status === "done" || task.status === "done") {
    if (status === "done") return toggleTaskDone(task, true);
    useWorkspace.getState().setTaskStatus(task.id, status);
    toast.success(`Reopened as ${taskStatusLabel(status)}`, { description: task.title });
    return;
  }
  useWorkspace.getState().setTaskStatus(task.id, status);
  toast.success(`Moved to ${taskStatusLabel(status)}`, { description: task.title });
}
