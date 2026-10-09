import type { SeedData } from "./data/seed";
import { employees } from "./data/people";
import { documents, repositories } from "./data/catalog";
import { canViewDocument, canViewMeeting, canViewProject, canViewRepo } from "./permissions";
import { dateOf, mondayOf, toISODate } from "./time";
import { entriesForWeek, totalHours } from "./hours";
import type { Activity, Employee, ID, ISODate, Meeting, Project, Task } from "./types";

/** The subset of store state that selectors read. Keeps selectors testable without React. */
export type S = SeedData & { currentUserId: ID };

export const employeeById = (id: ID | undefined): Employee | undefined => employees.find((e) => e.id === id);
export const me = (s: S): Employee => employeeById(s.currentUserId)!;
export const projectById = (s: S, id: ID | undefined) => s.projects.find((p) => p.id === id);
export const repoById = (id: ID | undefined) => repositories.find((r) => r.id === id);

export const priorityRank: Record<Task["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Progress = half milestone completion, half task completion. Recomputed live from tasks. */
export function projectProgress(s: S, project: Project): number {
  const tasks = s.tasks.filter((t) => t.projectId === project.id);
  const taskRatio = tasks.length ? tasks.filter((t) => t.status === "done").length / tasks.length : 0;
  const msRatio = project.milestones.length ? project.milestones.filter((m) => m.done).length / project.milestones.length : 0;
  return Math.round((taskRatio * 0.5 + msRatio * 0.5) * 100);
}

export function visibleProjects(s: S): Project[] {
  return s.projects.filter((p) => canViewProject(s, s.currentUserId, p));
}

export function myProjects(s: S): Project[] {
  return s.projects.filter((p) => p.teamIds.includes(s.currentUserId) || p.ownerId === s.currentUserId);
}

export function myOpenTasks(s: S): Task[] {
  return s.tasks
    .filter((t) => t.assigneeId === s.currentUserId && t.status !== "done")
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

/** Simple, explainable priority score: urgency, deadline and blockers. */
export function taskScore(t: Task, today: ISODate): number {
  let score = 4 - priorityRank[t.priority];
  if (t.due) {
    if (t.due < today) score += 4;
    else if (t.due === today) score += 3;
    else if (t.due <= toISODate(new Date(Date.now() + 2 * 86400000))) score += 1.5;
  }
  if (t.tags.includes("blocker")) score += 2;
  if (t.status === "in-progress") score += 0.5;
  return score;
}

export function todaysPriorities(s: S, today = toISODate()): Task[] {
  return myOpenTasks(s).sort((a, b) => taskScore(b, today) - taskScore(a, today));
}

export function myMeetings(s: S): Meeting[] {
  return s.meetings.filter((m) => m.participantIds.includes(s.currentUserId)).sort((a, b) => a.start.localeCompare(b.start));
}

export function meetingsOn(s: S, date: ISODate): Meeting[] {
  return myMeetings(s).filter((m) => dateOf(m.start) === date);
}

export function visibleMeetings(s: S): Meeting[] {
  return s.meetings.filter((m) => canViewMeeting(s, s.currentUserId, m)).sort((a, b) => a.start.localeCompare(b.start));
}

export function myMessages(s: S) {
  return s.messages.filter((m) => m.recipientId === s.currentUserId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function attentionMessages(s: S) {
  return myMessages(s).filter((m) => !m.archived && (m.needsAction || (m.important && !m.read)));
}

export function pendingApprovals(s: S) {
  return s.accessRequests.filter((r) => r.approverId === s.currentUserId && r.status === "pending");
}

export function visibleDocuments(s: S) {
  return documents.filter((d) => canViewDocument(s, s.currentUserId, d));
}

export function visibleRepos(s: S) {
  return repositories.filter((r) => canViewRepo(s, s.currentUserId, r));
}

export function visibleIssues(s: S) {
  const repos = new Set(visibleRepos(s).map((r) => r.id));
  return s.issues.filter((i) => repos.has(i.repoId));
}

export function visiblePullRequests(s: S) {
  const repos = new Set(visibleRepos(s).map((r) => r.id));
  return s.pullRequests.filter((p) => repos.has(p.repoId));
}

/**
 * Activity feed for the current user: their own actions, items addressed to them,
 * and project activity from projects they can see. Restricted project activity never leaks.
 */
export function myActivity(s: S): Activity[] {
  const visible = new Set(visibleProjects(s).map((p) => p.id));
  const mine = new Set(myProjects(s).map((p) => p.id));
  return s.activity
    .filter((a) => {
      if (a.visibleTo) return a.visibleTo.includes(s.currentUserId);
      if (a.actorId === s.currentUserId) return true;
      if (a.projectId) return visible.has(a.projectId) && mine.has(a.projectId);
      return false;
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function hoursThisWeek(s: S, today = toISODate()) {
  const entries = entriesForWeek(s.hours, s.currentUserId, mondayOf(today));
  return { entries, total: totalHours(entries) };
}

export function myNotifications(s: S) {
  return s.notifications.filter((n) => n.userId === s.currentUserId).sort((a, b) => b.at.localeCompare(a.at));
}

export function learningProfile(s: S, userId = s.currentUserId) {
  return s.learning.find((l) => l.userId === userId);
}

export function teamMembers(s: S): Employee[] {
  const ids = me(s).approves?.teamMemberIds ?? [];
  return employees.filter((e) => ids.includes(e.id));
}

/** For a team lead: open-task workload per team member. */
export function workload(s: S) {
  return teamMembers(s).map((e) => {
    const open = s.tasks.filter((t) => t.assigneeId === e.id && t.status !== "done");
    return { employee: e, open: open.length, urgent: open.filter((t) => t.priority === "urgent" || t.priority === "high").length };
  });
}

export function overdueTasks(s: S, projectId?: ID, today = toISODate()) {
  return s.tasks.filter((t) => t.status !== "done" && t.due && t.due < today && (!projectId || t.projectId === projectId));
}
