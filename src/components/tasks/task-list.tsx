"use client";

import { AlertTriangle, CalendarClock, CalendarDays, CalendarRange, CheckCircle2, CircleDashed, type LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityDot, TaskStatusBadge } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { employeeById, projectById, type S } from "@/lib/selectors";
import type { ID, ISODate, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DueLabel, GithubChip, ProjectChip, SourceChip, toggleTaskDone } from "./task-bits";
import { canEditTask, type GroupKey } from "./task-utils";

const GROUP_STYLE: Record<GroupKey, { icon: LucideIcon; className: string }> = {
  overdue: { icon: AlertTriangle, className: "text-danger" },
  today: { icon: CalendarClock, className: "text-warning" },
  week: { icon: CalendarRange, className: "text-foreground" },
  later: { icon: CalendarDays, className: "text-foreground" },
  none: { icon: CircleDashed, className: "text-muted-foreground" },
  done: { icon: CheckCircle2, className: "text-success" },
};

export function TaskList({ s, groups, today, onOpen }: { s: S; groups: { key: GroupKey; label: string; hint?: string; tasks: Task[] }[]; today: ISODate; onOpen: (id: ID) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card" data-testid="task-list">
      {groups.map((g) => {
        const style = GROUP_STYLE[g.key];
        const Icon = style.icon;
        return (
          <section key={g.key} aria-labelledby={`group-${g.key}`} data-group={g.key}>
            <h2 id={`group-${g.key}`} className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold">
              <Icon className={cn("size-3.5", style.className)} aria-hidden />
              <span className={style.className}>{g.label}</span>
              {g.hint && <span className="font-normal text-muted-foreground">{g.hint}</span>}
              <span className="ml-auto font-medium text-muted-foreground tabular">{g.tasks.length}</span>
            </h2>
            <ul className="divide-y border-b last:border-b-0">
              {g.tasks.map((t) => (
                <TaskRow key={t.id} s={s} task={t} today={today} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({ s, task: t, today, onOpen }: { s: S; task: Task; today: ISODate; onOpen: (id: ID) => void }) {
  const done = t.status === "done";
  const editable = canEditTask(s, t);
  const assignee = employeeById(t.assigneeId);
  return (
    <li data-testid="task-row" data-task-id={t.id} className="flex items-start gap-3 px-4 py-2.5 transition hover:bg-muted/50">
      <Checkbox
        data-testid="task-toggle"
        className="mt-0.5"
        checked={done}
        disabled={!editable}
        onCheckedChange={(c) => toggleTaskDone(t, c === true)}
        aria-label={done ? `Reopen “${t.title}”` : `Mark “${t.title}” as done`}
      />
      <button type="button" onClick={() => onOpen(t.id)} className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="flex items-start gap-2">
          <span className="mt-1.5 flex">
            <PriorityDot priority={t.priority} />
          </span>
          <span className={cn("line-clamp-2 min-w-0 text-sm font-medium sm:line-clamp-1", done && "text-muted-foreground line-through decoration-muted-foreground/50")}>{t.title}</span>
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
          {(t.status === "in-progress" || t.status === "review") && <TaskStatusBadge status={t.status} />}
          <ProjectChip project={projectById(s, t.projectId)} />
          <SourceChip source={t.source} />
          <GithubChip s={s} task={t} />
          {t.assigneeId !== s.currentUserId && assignee && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <PersonAvatar person={assignee} size="xs" />
              {assignee.firstName}
            </span>
          )}
        </span>
      </button>
      <DueLabel task={t} today={today} className="mt-0.5" />
    </li>
  );
}
