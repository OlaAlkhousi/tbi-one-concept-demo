import { formatHours } from "../hours";
import {
  attentionMessages,
  hoursThisWeek,
  me,
  meetingsOn,
  myProjects,
  overdueTasks,
  pendingApprovals,
  projectProgress,
  todaysPriorities,
  visibleProjects,
  visiblePullRequests,
  workload,
  type S,
} from "../selectors";
import { formatTime, greeting, toISODate } from "../time";
import { employees } from "../data/people";
import { list, plural } from "./text";

export interface BriefingLine {
  text: string;
  href?: string;
  tone?: "default" | "warning" | "positive";
}

export interface Briefing {
  greeting: string;
  headline: string;
  lines: BriefingLine[];
}

/**
 * "Your AI Morning Briefing" — a short, role-aware summary built from workspace data.
 * Every line points at the record it is based on.
 */
export function morningBriefing(s: S, now = new Date()): Briefing {
  const today = toISODate(now);
  const user = me(s);
  const meetings = meetingsOn(s, today);
  const upcomingMeetings = meetings.filter((m) => new Date(m.end) > now);
  const tasks = todaysPriorities(s, today);
  const attention = attentionMessages(s);
  const approvals = pendingApprovals(s);
  const lines: BriefingLine[] = [];

  const headline = `You have ${plural(meetings.length, "meeting")} today, ${plural(tasks.length, "open task")}, and ${plural(attention.length + approvals.length, "item")} that need${attention.length + approvals.length === 1 ? "s" : ""} your attention.`;

  const top = tasks[0];
  if (top) {
    const why = top.due && top.due < today ? "it is overdue" : top.due === today ? "it is due today" : top.priority === "urgent" ? "it is marked urgent" : "it has the highest priority";
    lines.push({ text: `Start with “${top.title}” — ${why}.`, href: `/tasks?task=${top.id}`, tone: top.due && top.due <= today ? "warning" : "default" });
  }

  const next = upcomingMeetings[0];
  if (next) {
    const unsummarised = s.meetings.find((m) => m.participantIds.includes(s.currentUserId) && m.actionPoints?.length && !m.actionPlanCreatedAt && new Date(m.end) < now);
    lines.push({ text: `Next meeting: ${next.title} at ${formatTime(next.start)}.`, href: `/calendar/${next.id}` });
    if (unsummarised) lines.push({ text: `“${unsummarised.title}” has ${plural(unsummarised.actionPoints!.length, "action point")} that are not yet tasks.`, href: `/calendar/${unsummarised.id}`, tone: "warning" });
  }

  if (user.persona === "intern" || user.persona === "developer") {
    const reviews = visiblePullRequests(s).filter((p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId));
    if (reviews.length) lines.push({ text: `${plural(reviews.length, "pull request")} wait${reviews.length === 1 ? "s" : ""} for your review: ${list(reviews.map((r) => `#${r.number}`))}.`, href: "/github" });
    const { total, entries } = hoursThisWeek(s, today);
    const drafts = entries.filter((e) => e.status === "draft").length;
    if (drafts) lines.push({ text: `${formatHours(total)} hours registered this week, ${plural(drafts, "draft entry", "draft entries")} not yet submitted.`, href: "/hours" });
  }

  if (user.persona === "lead") {
    if (approvals.length) lines.push({ text: `${plural(approvals.length, "access request")} wait${approvals.length === 1 ? "s" : ""} for your decision.`, href: "/requests", tone: "warning" });
    const submitted = s.hours.filter((h) => h.status === "submitted" && (user.approves?.teamMemberIds ?? []).includes(h.userId));
    const people = [...new Set(submitted.map((h) => employees.find((e) => e.id === h.userId)?.firstName))];
    if (people.length) lines.push({ text: `Timesheets to approve from ${list(people as string[])}.`, href: "/hours" });
    const busiest = workload(s).sort((a, b) => b.urgent - a.urgent)[0];
    if (busiest && busiest.urgent >= 2) lines.push({ text: `${busiest.employee.firstName} has ${busiest.urgent} high-priority tasks — check whether the workload is balanced.`, href: "/people" });
  }

  if (user.persona === "pm" || user.persona === "lead") {
    // A PM hears about their own projects; a team lead about every project they can see.
    const scope = user.persona === "pm" ? myProjects(s) : visibleProjects(s);
    for (const p of scope.filter((p) => p.status === "blocked" || p.status === "at-risk")) {
      lines.push({ text: `${p.name} is ${p.status === "blocked" ? "blocked" : "at risk"} (${projectProgress(s, p)}% done): ${p.risks.find((r) => r.isBlocker || r.severity === "high")?.title ?? "see risks"}.`, href: `/projects/${p.id}`, tone: "warning" });
    }
  }

  const overdue = overdueTasks(s).filter((t) => t.assigneeId === s.currentUserId);
  if (overdue.length > 1) lines.push({ text: `${plural(overdue.length, "task")} overdue.`, href: "/tasks", tone: "warning" });

  const firstMsg = attention[0];
  if (firstMsg) {
    const from = employees.find((e) => e.id === firstMsg.fromId)?.firstName ?? firstMsg.fromName;
    lines.push({ text: `${from} is waiting: “${firstMsg.subject}”.`, href: `/inbox?m=${firstMsg.id}` });
  }

  return { greeting: `${greeting(now)}, ${user.firstName}.`, headline, lines: lines.slice(0, 6) };
}
