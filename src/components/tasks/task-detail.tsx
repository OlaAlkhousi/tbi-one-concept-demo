"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, CalendarDays, ChevronRight, CircleDot, FileQuestion, Inbox, Lightbulb, Lock, Pencil, PenLine, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useS, useToday } from "@/components/common/hooks";
import { AiBadge } from "@/components/common/layout";
import { Field } from "@/components/common/field";
import { Pill, PriorityDot, taskStatusLabel } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { RichText } from "@/components/common/rich-text";
import { canViewMeeting } from "@/lib/permissions";
import { employeeById, projectById, type S } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { ID, Priority, Task, TaskStatus } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { DueLabel, githubIssueFor, moveTask } from "./task-bits";
import { canEditTask, canSeeTask, relatedTasks } from "./task-utils";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "review", "done"];
const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

function Section({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {title}
        {extra}
      </h3>
      {children}
    </section>
  );
}

function LinkCard({ href, icon: Icon, title, subtitle }: { href?: string; icon: LucideIcon; title: React.ReactNode; subtitle?: React.ReactNode }) {
  const inner = (
    <>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/30 hover:bg-muted/40">
      {inner}
    </Link>
  ) : (
    <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">{inner}</div>
  );
}

/** Where the task came from, linked only when the user may open the source. */
function SourceCard({ s, task }: { s: S; task: Task }) {
  const src = task.source;
  switch (src.type) {
    case "meeting": {
      const m = s.meetings.find((x) => x.id === src.id);
      if (!m || !canViewMeeting(s, s.currentUserId, m)) return <LinkCard icon={Lock} title="From a meeting" subtitle="You were not in this meeting, so it stays private." />;
      return <LinkCard href={`/calendar/${m.id}`} icon={CalendarDays} title={`From meeting: ${m.title}`} subtitle={formatDate(m.start, "EEE d MMM, HH:mm")} />;
    }
    case "message": {
      const m = s.messages.find((x) => x.id === src.id && x.recipientId === s.currentUserId);
      if (!m) return <LinkCard icon={Lock} title="From a message" subtitle="The message is in someone else's inbox, so only they can read it." />;
      return <LinkCard href={`/inbox?m=${m.id}`} icon={Inbox} title={`From message: ${m.subject}`} subtitle={`${employeeById(m.fromId)?.name ?? m.fromName} · ${formatDate(m.receivedAt, "d MMM")}`} />;
    }
    case "insight": {
      const p = projectById(s, task.projectId);
      return p ? (
        <LinkCard href={`/projects/${p.id}?tab=insights`} icon={Lightbulb} title="From an AI insight" subtitle={`Project insights · ${p.name}`} />
      ) : (
        <LinkCard icon={Lightbulb} title="From an AI insight" />
      );
    }
    case "assistant":
      return <LinkCard icon={Bot} title="Created with the TBI ONE assistant" subtitle="Proposed by the assistant and confirmed by a person." />;
    case "manual":
      return <LinkCard icon={PenLine} title="Created manually" subtitle={`By ${task.creatorId === s.currentUserId ? "you" : (employeeById(task.creatorId)?.name ?? "a colleague")}`} />;
  }
}

/** Task detail sheet, driven by ?task=<id>. Keeps the last task on screen while it animates closed. */
export function TaskDetailSheet({ taskId, onClose, onOpen }: { taskId: ID | null; onClose: () => void; onOpen: (id: ID) => void }) {
  const s = useS();
  const today = useToday();
  const updateTask = useWorkspace((x) => x.updateTask);
  const deleteTask = useWorkspace((x) => x.deleteTask);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Set on delete so the sheet closes at once instead of waiting for the URL to update.
  const [dismissedId, setDismissedId] = useState<ID | null>(null);
  const open = Boolean(taskId) && taskId !== dismissedId;

  const [lastId, setLastId] = useState(taskId);
  if (taskId && taskId !== lastId) setLastId(taskId);
  const live = s.tasks.find((t) => t.id === (taskId ?? lastId));
  const [lastTask, setLastTask] = useState(live);
  if (live && live !== lastTask) setLastTask(live);
  const found = live ?? (open ? undefined : lastTask);
  const task = found && canSeeTask(s, found) ? found : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg" data-testid="task-detail">
          {task ? (
            <TaskDetailBody s={s} task={task} today={today} onOpen={onOpen} onDelete={() => setConfirmDelete(true)} onPriority={(p) => (updateTask(task.id, { priority: p }), toast.success(`Priority set to ${p}`))} />
          ) : (
            <>
              <SheetHeader className="border-b p-5 pr-12">
                <SheetTitle>Task not available</SheetTitle>
                <SheetDescription>It may have been deleted, or it belongs to a project you can&apos;t open.</SheetDescription>
              </SheetHeader>
              <div className="p-5">
                <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
                  <FileQuestion className="mb-3 size-6 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">You only see your own tasks and tasks in projects you have access to.</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={onClose}>
                    Back to My Tasks
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <DialogDescription>“{task?.title}” is removed from this demo workspace. This can&apos;t be undone, apart from resetting the demo.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="task-delete-confirm"
              onClick={() => {
                if (!task) return;
                setDismissedId(task.id);
                setConfirmDelete(false);
                deleteTask(task.id);
                onClose();
                toast.success("Task deleted", { description: task.title });
              }}
            >
              <Trash2 /> Delete task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskDetailBody({ s, task, today, onOpen, onDelete, onPriority }: { s: S; task: Task; today: string; onOpen: (id: ID) => void; onDelete: () => void; onPriority: (p: Priority) => void }) {
  const project = projectById(s, task.projectId);
  const owner = employeeById(task.assigneeId);
  const creator = employeeById(task.creatorId);
  const editable = canEditTask(s, task);
  const gh = githubIssueFor(s, task);
  const related = relatedTasks(s, task);

  return (
    <>
      <SheetHeader className="gap-1.5 border-b p-5 pr-12">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {project ? (
            <>
              <span className="size-1.5 rounded-full" style={{ background: `oklch(0.62 0.13 ${project.hue})` }} aria-hidden />
              {project.code} · {project.name}
            </>
          ) : (
            "Personal task"
          )}
        </p>
        <SheetTitle className="text-lg leading-snug font-semibold">{task.title}</SheetTitle>
        <SheetDescription>
          Created {formatDate(task.createdAt, "d MMM yyyy")} by {task.creatorId === s.currentUserId ? "you" : (creator?.name ?? "a colleague")}
          {task.completedAt ? ` · completed ${formatDate(task.completedAt, "d MMM yyyy")}` : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field id="task-detail-status" label="Status">
            <Select value={task.status} onValueChange={(v) => moveTask(task, v as TaskStatus)} disabled={!editable}>
              <SelectTrigger id="task-detail-status" className="w-full" data-testid="task-detail-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {taskStatusLabel(st)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="task-detail-priority" label="Priority">
            <Select value={task.priority} onValueChange={(v) => onPriority(v as Priority)} disabled={!editable}>
              <SelectTrigger id="task-detail-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <PriorityDot priority={p} />
                    <span className="capitalize">{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Owner</dt>
          <dd className="flex min-w-0 items-center gap-2">
            <PersonAvatar person={owner} size="xs" />
            <span className="truncate">
              {owner?.name ?? "Unknown"}
              {task.assigneeId === s.currentUserId && <span className="text-muted-foreground"> (you)</span>}
            </span>
          </dd>
          <dt className="text-muted-foreground">Project</dt>
          <dd className="min-w-0 truncate">
            {project ? (
              <Link href={`/projects/${project.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {project.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">None (personal)</span>
            )}
          </dd>
          <dt className="text-muted-foreground">Deadline</dt>
          <dd className="flex flex-wrap items-center gap-x-2">
            {task.due ? (
              <>
                {formatDate(task.due, "EEE d MMM yyyy")}
                <DueLabel task={task} today={today} />
              </>
            ) : (
              <span className="text-muted-foreground">No deadline</span>
            )}
          </dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDate(task.createdAt, "EEE d MMM yyyy, HH:mm")}</dd>
          {task.completedAt && (
            <>
              <dt className="text-muted-foreground">Completed</dt>
              <dd>{formatDate(task.completedAt, "EEE d MMM yyyy, HH:mm")}</dd>
            </>
          )}
          {task.tags.length > 0 && (
            <>
              <dt className="text-muted-foreground">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {task.tags.map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
              </dd>
            </>
          )}
        </dl>

        <Section title="Description">
          {task.description.trim() ? <RichText text={task.description} className="text-foreground/90" /> : <p className="text-sm text-muted-foreground">No description.</p>}
        </Section>

        <Section title="Source">
          <SourceCard s={s} task={task} />
        </Section>

        {gh && (
          <Section title="Linked GitHub issue (simulated)">
            <Link href={`/github?issue=${gh.issue.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition hover:border-primary/30 hover:bg-muted/40" data-testid="task-github-issue">
              <CircleDot className={gh.issue.state === "open" ? "size-4 shrink-0 text-success" : "size-4 shrink-0 text-muted-foreground"} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{gh.issue.title}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {gh.repo?.name}#{gh.issue.number}
                </span>
              </span>
              <Pill tone={gh.issue.state === "open" ? "success" : "neutral"}>{gh.issue.state === "open" ? "Open" : "Closed"}</Pill>
            </Link>
          </Section>
        )}

        <Section title="Duplicate check" extra={<AiBadge />}>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">{project ? "No similar open tasks in this project." : "Personal tasks are not checked against project work."}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">Possibly related: open tasks in {project?.name} with overlapping wording.</p>
              <ul className="divide-y rounded-lg border" data-testid="task-related">
                {related.map(({ task: r, score }) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition outline-none hover:bg-muted/60 focus-visible:bg-muted">
                      <PriorityDot priority={r.priority} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{r.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {employeeById(r.assigneeId)?.name} · {taskStatusLabel(r.status)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-ai tabular">{Math.round(score * 100)}% match</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>

      <SheetFooter className="sticky bottom-0 flex-row items-center border-t bg-popover">
        {editable ? (
          <>
            <Button variant="outline" size="sm" onClick={() => useUi.getState().openTaskDialog({ editId: task.id })} data-testid="task-edit">
              <Pencil /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} data-testid="task-delete">
              <Trash2 /> Delete
            </Button>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden /> Read-only: only the owner, creator and project team can change this task.
          </p>
        )}
      </SheetFooter>
    </>
  );
}
