import { similarity } from "@/lib/ai/text";
import { canViewProjectId } from "@/lib/permissions";
import { priorityRank, type S } from "@/lib/selectors";
import { dateOf, daysBetween, mondayOf } from "@/lib/time";
import type { ISODate, Task } from "@/lib/types";

export type TaskScope = "mine" | "created" | "all";

export const SCOPE_LABEL: Record<TaskScope, string> = {
  mine: "Assigned to me",
  created: "Created by me",
  all: "All visible project tasks",
};

/** Own tasks (assigned or created) plus tasks in projects the user may open. */
export function canSeeTask(s: S, t: Task): boolean {
  const me = s.currentUserId;
  if (t.assigneeId === me || t.creatorId === me) return true;
  if (!t.projectId) return false;
  return canViewProjectId(s, me, t.projectId);
}

/** Owner, creator and project members may change a task; other viewers only read it. */
export function canEditTask(s: S, t: Task): boolean {
  const me = s.currentUserId;
  if (t.assigneeId === me || t.creatorId === me) return true;
  const p = s.projects.find((x) => x.id === t.projectId);
  return Boolean(p && (p.ownerId === me || p.teamIds.includes(me)));
}

export function inScope(s: S, t: Task, scope: TaskScope): boolean {
  if (scope === "mine") return t.assigneeId === s.currentUserId;
  if (scope === "created") return t.creatorId === s.currentUserId;
  return canSeeTask(s, t);
}

export type GroupKey = "overdue" | "today" | "week" | "later" | "none" | "done";

export const GROUPS: { key: GroupKey; label: string; hint?: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week", hint: "next 7 days" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date" },
  { key: "done", label: "Done" },
];

/** `today` is the Europe/Amsterdam calendar date (useToday). */
export function groupOf(t: Task, today: ISODate): GroupKey {
  if (t.status === "done") return "done";
  if (!t.due) return "none";
  if (t.due < today) return "overdue";
  if (t.due === today) return "today";
  return daysBetween(today, t.due) <= 7 ? "week" : "later";
}

export const byPriorityThenDue = (a: Task, b: Task) => priorityRank[a.priority] - priorityRank[b.priority] || (a.due ?? "9999").localeCompare(b.due ?? "9999");

export function groupTasks(tasks: Task[], today: ISODate) {
  return GROUPS.map((g) => ({
    ...g,
    tasks: tasks
      .filter((t) => groupOf(t, today) === g.key)
      .sort(g.key === "done" ? (a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : byPriorityThenDue),
  })).filter((g) => g.tasks.length > 0);
}

/** Open tasks in the same project whose wording overlaps enough to be a possible duplicate. */
export function relatedTasks(s: S, task: Task, threshold = 0.45): { task: Task; score: number }[] {
  if (!task.projectId) return [];
  return s.tasks
    .filter((t) => t.id !== task.id && t.status !== "done" && t.projectId === task.projectId && canSeeTask(s, t))
    .map((t) => ({ task: t, score: Math.max(similarity(task.title, t.title), similarity(`${task.title} ${task.description}`, `${t.title} ${t.description}`)) }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function taskStats(s: S, today: ISODate) {
  const mine = s.tasks.filter((t) => t.assigneeId === s.currentUserId);
  const open = mine.filter((t) => t.status !== "done");
  const monday = mondayOf(today);
  return {
    open: open.length,
    dueToday: open.filter((t) => t.due === today).length,
    overdue: open.filter((t) => t.due && t.due < today).length,
    completedThisWeek: mine.filter((t) => t.status === "done" && t.completedAt && dateOf(t.completedAt) >= monday).length,
  };
}
