"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityDot, TaskStatusBadge, taskStatusLabel } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { projectById, type S } from "@/lib/selectors";
import type { ID, ISODate, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DueLabel, GithubChip, ProjectChip, SourceChip, moveTask } from "./task-bits";
import { byPriorityThenDue, canEditTask } from "./task-utils";

const COLUMNS: TaskStatus[] = ["todo", "in-progress", "review", "done"];

/**
 * Kanban board. The status select on each card is the primary (keyboard and touch)
 * way to move a card; drag-and-drop is a mouse shortcut on top of it.
 */
export function TaskBoard({ s, tasks, today, showCompleted, onShowCompleted, onOpen }: { s: S; tasks: Task[]; today: ISODate; showCompleted: boolean; onShowCompleted: () => void; onOpen: (id: ID) => void }) {
  const [over, setOver] = useState<TaskStatus | null>(null);

  function drop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    setOver(null);
    const task = s.tasks.find((t) => t.id === e.dataTransfer.getData("text/plain"));
    if (task && canEditTask(s, task)) moveTask(task, status);
  }

  return (
    <div className="@container/board">
      <div className="grid snap-x auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 @4xl/board:grid-flow-row @4xl/board:grid-cols-4 @4xl/board:overflow-visible" data-testid="task-board">
        {COLUMNS.map((status) => {
          const items = tasks.filter((t) => t.status === status).sort(byPriorityThenDue);
          const hidden = status === "done" && !showCompleted;
          return (
            <section
              key={status}
              aria-label={`${taskStatusLabel(status)}, ${hidden ? "hidden" : items.length} tasks`}
              data-column={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => drop(e, status)}
              className={cn("flex min-h-[220px] snap-start flex-col rounded-xl border bg-muted/40 transition-colors", over === status && "border-primary/40 bg-accent/60")}
            >
              <header className="flex items-center gap-2 px-3 py-2.5">
                <TaskStatusBadge status={status} />
                {!hidden && <span className="text-xs font-medium text-muted-foreground tabular">{items.length}</span>}
              </header>
              {hidden ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Completed tasks are hidden.</p>
                  <Button size="xs" variant="outline" onClick={onShowCompleted}>
                    Show completed
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-1 flex-col gap-2 p-2 pt-0">
                  {items.map((t) => (
                    <BoardCard key={t.id} s={s} task={t} today={today} onOpen={onOpen} />
                  ))}
                  {items.length === 0 && <li className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">No tasks</li>}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ s, task: t, today, onOpen }: { s: S; task: Task; today: ISODate; onOpen: (id: ID) => void }) {
  const editable = canEditTask(s, t);
  return (
    <li
      data-testid="task-card"
      data-task-id={t.id}
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn("rounded-lg border bg-card p-3 shadow-card transition hover:shadow-lift", editable && "cursor-grab active:cursor-grabbing")}
    >
      <button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-start gap-2 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="mt-[7px] flex">
          <PriorityDot priority={t.priority} />
        </span>
        <span className={cn("text-sm leading-snug font-medium", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <ProjectChip project={projectById(s, t.projectId)} />
        <SourceChip source={t.source} />
        <GithubChip s={s} task={t} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <PersonAvatar id={t.assigneeId} size="xs" />
        <DueLabel task={t} today={today} />
        <Select value={t.status} onValueChange={(v) => moveTask(t, v as TaskStatus)} disabled={!editable}>
          <SelectTrigger size="sm" className="ml-auto h-6 text-xs" aria-label={`Status of “${t.title}”`} data-testid="task-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            {COLUMNS.map((c) => (
              <SelectItem key={c} value={c}>
                {taskStatusLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}
