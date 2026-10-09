import { employees } from "../data/people";
import { courses } from "../data/catalog";
import { entriesForWeek, formatHours, hoursByProject, totalHours } from "../hours";
import type { S } from "../selectors";
import { dateOf, formatDate, weekDates } from "../time";
import type { ID, ISODate, LogbookEntry } from "../types";
import { list, plural } from "./text";

/**
 * "Generate My Work Summary" — drafts a weekly logbook entry from recorded activity.
 *
 * Only facts recorded in the workspace are used. Hours come exclusively from the
 * hours registration: if nothing was registered, the draft says so instead of guessing.
 * The draft is always editable and is only saved when the employee chooses to.
 */

export interface WorkSummary {
  draft: Omit<LogbookEntry, "id" | "userId" | "createdAt" | "updatedAt">;
  facts: { label: string; value: string }[];
  sources: { label: string; count: number }[];
}

export function generateWorkSummary(s: S, userId: ID, monday: ISODate): WorkSummary {
  const days = new Set(weekDates(monday));
  const inWeek = (iso?: string) => (iso ? days.has(dateOf(iso)) : false);
  const projName = (id?: ID) => s.projects.find((p) => p.id === id)?.name;

  const completed = s.tasks.filter((t) => t.assigneeId === userId && t.status === "done" && inWeek(t.completedAt));
  const inProgress = s.tasks.filter((t) => t.assigneeId === userId && (t.status === "in-progress" || t.status === "review"));
  const meetings = s.meetings.filter((m) => m.participantIds.includes(userId) && inWeek(m.start) && new Date(m.end) <= new Date());
  const decisions = meetings.flatMap((m) => (m.decisions ?? []).map((d) => `${d} (${m.title})`));
  const issues = s.issues.filter((i) => i.authorId === userId && inWeek(i.createdAt));
  const prs = s.pullRequests.filter((p) => p.authorId === userId && inWeek(p.createdAt));
  const hours = entriesForWeek(s.hours, userId, monday);
  const total = totalHours(hours);
  const byProject = hoursByProject(hours);
  const learning = s.activity.filter((a) => a.actorId === userId && a.source === "learning" && inWeek(a.at));
  const profile = s.learning.find((l) => l.userId === userId);
  const activeCourses = (profile?.enrolledCourseIds ?? [])
    .map((id) => courses.find((c) => c.id === id))
    .filter((c) => c && (profile?.completedLessons[c.id]?.length ?? 0) > 0 && (profile?.completedLessons[c.id]?.length ?? 0) < c.lessons.length)
    .map((c) => c!.title);
  const upcoming = s.tasks
    .filter((t) => t.assigneeId === userId && t.status !== "done")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 4);

  const projectIds = [...new Set([...completed, ...inProgress].map((t) => t.projectId).filter(Boolean) as ID[])];

  const completedText = [
    ...completed.map((t) => `- ${t.title}${projName(t.projectId) ? ` (${projName(t.projectId)})` : ""}`),
    ...prs.map((p) => `- Opened pull request #${p.number}: ${p.title}`),
    ...issues.map((i) => `- Created issue #${i.number}: ${i.title}`),
    ...(meetings.length ? [`- Took part in ${plural(meetings.length, "meeting")}: ${list(meetings.slice(0, 4).map((m) => m.title))}`] : []),
  ].join("\n");

  const hoursText = hours.length
    ? `Registered hours: ${formatHours(total)} (${Object.entries(byProject)
        .map(([pid, h]) => `${projName(pid) ?? "Other"} ${formatHours(h)}`)
        .join(", ")}).`
    : "No hours registered for this week yet — add them in Hours before submitting.";

  const challenges = inProgress.length
    ? `Still in progress: ${list(inProgress.map((t) => t.title))}.\n[Add what was difficult and how you handled it.]`
    : "[Add what was difficult this week and how you handled it.]";

  const learnings = [
    learning.length ? `Completed ${plural(learning.length, "lesson")} this week.` : "",
    activeCourses.length ? `Working on: ${list(activeCourses)}.` : "",
    "[Add one or two things you learned, in your own words.]",
  ]
    .filter(Boolean)
    .join("\n");

  const me = employees.find((e) => e.id === userId);
  return {
    draft: {
      kind: "weekly",
      date: monday,
      title: `Week report — ${formatDate(monday, "d MMM")}${me ? ` (${me.firstName})` : ""}`,
      projectIds,
      completed: completedText ? `${completedText}\n\n${hoursText}` : `[No completed work recorded yet this week.]\n\n${hoursText}`,
      challenges,
      learnings,
      decisions: decisions.length ? decisions.map((d) => `- ${d}`).join("\n") : "[No decisions recorded in your meetings this week.]",
      nextSteps: upcoming.length ? upcoming.map((t) => `- ${t.title}${t.due ? ` (due ${formatDate(t.due, "EEE d MMM")})` : ""}`).join("\n") : "[Add your plans for next week.]",
      generated: true,
    },
    facts: [
      { label: "Completed tasks", value: String(completed.length) },
      { label: "Meetings attended", value: String(meetings.length) },
      { label: "Pull requests & issues", value: String(prs.length + issues.length) },
      { label: "Registered hours", value: hours.length ? formatHours(total) : "none" },
    ],
    sources: [
      { label: "Tasks", count: completed.length + inProgress.length },
      { label: "Meetings", count: meetings.length },
      { label: "GitHub", count: prs.length + issues.length },
      { label: "Learning", count: learning.length },
      { label: "Hours entries", count: hours.length },
    ],
  };
}
