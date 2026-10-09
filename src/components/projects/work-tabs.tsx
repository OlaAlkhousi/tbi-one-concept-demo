"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Activity as ActivityIcon, CalendarDays, CircleCheck, Circle, ClipboardCheck, GitBranch, ListChecks, MapPin, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, PriorityDot, SourceLabel, TaskStatusBadge } from "@/components/common/badges";
import { EmptyState, Panel } from "@/components/common/layout";
import { AvatarStack, PersonAvatar } from "@/components/common/person-avatar";
import { canViewMeeting } from "@/lib/permissions";
import { employeeById, priorityRank, type S } from "@/lib/selectors";
import { formatDate, formatTime, relativeDue, timeAgo } from "@/lib/time";
import type { Meeting, Project, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";

// ─── Tasks ─────────────────────────────────────────────────────────────────

const COLUMNS: TaskStatus[] = ["todo", "in-progress", "review", "done"];

export function TasksTab({ s, project: p, today }: { s: S; project: Project; today: string }) {
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks yet"
        description="Tasks you create here show up in My Tasks, on the dashboard and in the project progress."
        action={
          <Button size="sm" onClick={() => openTaskDialog({ initial: { projectId: p.id } })}>
            <Plus /> New task
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((status) => {
        const list = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
        return (
          <section key={status} aria-label={`${status} tasks`} className="min-w-0 rounded-xl border bg-muted/30 p-2">
            <header className="flex items-center justify-between px-2 pt-1 pb-2">
              <span className="flex items-center gap-2">
                <TaskStatusBadge status={status} />
                <span className="text-xs text-muted-foreground tabular">{list.length}</span>
              </span>
              {status === "todo" && (
                <Button size="icon-xs" variant="ghost" onClick={() => openTaskDialog({ initial: { projectId: p.id } })} aria-label={`New task in ${p.name}`}>
                  <Plus />
                </Button>
              )}
            </header>
            {list.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nothing here</p>
            ) : (
              <ul className="space-y-1.5">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} today={today} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({ task: t, today }: { task: Task; today: string }) {
  const setStatus = useWorkspace((x) => x.setTaskStatus);
  const done = t.status === "done";
  const due = t.due && !done ? relativeDue(t.due, today) : undefined;
  const assignee = employeeById(t.assigneeId);
  function toggle() {
    setStatus(t.id, done ? "todo" : "done");
    toast.success(done ? "Task reopened" : "Task completed", { description: t.title });
  }
  return (
    <li className="flex items-start gap-2 rounded-lg border bg-card p-2.5 shadow-card">
      <button type="button" onClick={toggle} className={cn("mt-0.5 rounded-full transition", done ? "text-success" : "text-muted-foreground hover:text-success")} aria-label={done ? `Reopen "${t.title}"` : `Mark "${t.title}" as done`} aria-pressed={done}>
        {done ? <CircleCheck className="size-4" /> : <Circle className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <Link href={`/tasks?task=${t.id}`} className={cn("line-clamp-2 text-sm font-medium underline-offset-4 hover:underline", done && "text-muted-foreground line-through decoration-muted-foreground/50")}>
          {t.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <PersonAvatar person={assignee} size="xs" />
          <span className="sr-only">Assigned to {assignee?.name}.</span>
          <PriorityDot priority={t.priority} />
          {due && <span className={cn(due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "")}>{due.label}</span>}
          {t.githubIssueId && (
            <Link href={`/github?issue=${t.githubIssueId}`} className="inline-flex items-center gap-0.5 hover:text-foreground" aria-label="Open linked GitHub issue">
              <GitBranch className="size-3" aria-hidden /> issue
            </Link>
          )}
          {t.source.type === "insight" && (
            <span className="inline-flex items-center gap-0.5 text-ai">
              <Sparkles className="size-3" aria-hidden /> from insight
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Activity ──────────────────────────────────────────────────────────────

export function ActivityTab({ s, project: p }: { s: S; project: Project }) {
  const items = s.activity.filter((a) => a.projectId === p.id && (!a.visibleTo || a.visibleTo.includes(s.currentUserId))).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Panel title="Project activity" icon={ActivityIcon} description="From GitHub, Teams, meetings, tasks and the project record" bodyClassName="p-2">
      {items.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet" className="m-2 border-0" />
      ) : (
        <ol>
          {items.map((a) => {
            const actor = employeeById(a.actorId);
            const inner = (
              <>
                <PersonAvatar person={actor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{a.actorId === s.currentUserId ? "You" : actor?.name}</span> <span className="text-foreground/80">{a.text}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <SourceLabel source={a.source} />
                    <time dateTime={a.at} title={formatDate(a.at, "d MMM yyyy, HH:mm")}>
                      {timeAgo(a.at)}
                    </time>
                  </p>
                </div>
              </>
            );
            return (
              <li key={a.id}>
                {a.href ? (
                  <Link href={a.href} className="flex gap-2.5 rounded-lg px-2 py-2 transition hover:bg-muted/60">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex gap-2.5 px-2 py-2">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

// ─── Meetings ──────────────────────────────────────────────────────────────

export function MeetingsTab({ s, project: p }: { s: S; project: Project }) {
  const meetings = s.meetings.filter((m) => m.projectId === p.id && canViewMeeting(s, s.currentUserId, m));
  const now = new Date().toISOString();
  const upcoming = meetings.filter((m) => m.end > now).sort((a, b) => a.start.localeCompare(b.start));
  const past = meetings.filter((m) => m.end <= now).sort((a, b) => b.start.localeCompare(a.start));
  if (meetings.length === 0) return <EmptyState icon={CalendarDays} title="No meetings for this project" description="Project meetings from your calendar appear here." />;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <MeetingList title="Upcoming" meetings={upcoming} empty="No upcoming meetings." />
      <MeetingList title="Past" meetings={past} empty="No past meetings." />
    </div>
  );
}

function MeetingList({ title, meetings, empty }: { title: string; meetings: Meeting[]; empty: string }) {
  return (
    <Panel title={title} icon={CalendarDays} bodyClassName="p-2">
      {meetings.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul>
          {meetings.map((m) => {
            const points = m.actionPoints?.length ?? 0;
            return (
              <li key={m.id}>
                <Link href={`/calendar/${m.id}`} className="flex gap-3 rounded-lg px-2 py-2.5 transition hover:bg-muted/60" data-testid="project-meeting">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border bg-card py-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{formatDate(m.start, "MMM")}</span>
                    <span className="text-base leading-tight font-semibold tabular">{formatDate(m.start, "d")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="tabular">
                        {formatDate(m.start, "EEE")} {formatTime(m.start)}–{formatTime(m.end)}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="size-3 shrink-0" aria-hidden /> <span className="truncate">{m.location}</span>
                      </span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <AvatarStack ids={m.participantIds} max={4} />
                      {m.summary && (
                        <Pill tone="ai" icon={Sparkles}>
                          Summary
                        </Pill>
                      )}
                      {m.actionPlanCreatedAt ? (
                        <Pill tone="success" icon={ClipboardCheck}>
                          Action plan created · {m.followUpTaskIds.length} task{m.followUpTaskIds.length === 1 ? "" : "s"}
                        </Pill>
                      ) : points > 0 ? (
                        <Pill tone="warning">
                          {points} action point{points === 1 ? "" : "s"} to plan
                        </Pill>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
