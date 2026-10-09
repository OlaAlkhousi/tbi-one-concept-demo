import { employees } from "../data/people";
import { addDaysISO, dateOf, formatDate, toISODate } from "../time";
import type { S } from "../selectors";
import type { ActionPoint, Employee, ID, ISODate, Meeting, Priority } from "../types";
import { includesAny, sentenceCase, similarity } from "./text";

/**
 * "Generate Action Plan" — turns the action points of a meeting summary into
 * reviewable task suggestions.
 *
 * This is the deterministic demo engine. Every field comes with a reason, so the
 * employee can see *why* an owner, priority or deadline was suggested, and nothing
 * is created until the employee approves it.
 */

export interface Suggestion {
  id: ID;
  actionPointId: ID;
  title: string;
  description: string;
  projectId?: ID;
  ownerId: ID;
  ownerReason: string;
  priority: Priority;
  priorityReason: string;
  due: ISODate;
  dueReason: string;
  /** Existing open task or issue that looks like the same work. */
  duplicate?: { kind: "task" | "issue"; id: ID; label: string; score: number };
  /** Related open work (shown for context). */
  related: { kind: "task" | "issue"; id: ID; label: string }[];
  /** An open issue nobody is working on yet that this task could be linked to. */
  linkIssue?: { id: ID; label: string };
  confidence: number;
}

/** Which skills an action point needs, based on its wording. */
const SKILL_HINTS: { words: string[]; skills: string[]; label: string }[] = [
  { words: ["availability", "check", "database", "maintenance", "backend", "api"], skills: ["PostgreSQL", "Azure Functions", "Node.js"], label: "back-end logic" },
  { words: ["confirmation", "screen", "flow", "ui", "page", "form"], skills: ["React", "Next.js", "TypeScript"], label: "front-end work" },
  { words: ["approval", "administrative", "admin"], skills: ["Next.js", "TypeScript", "Approval workflows"], label: "an approval feature" },
  { words: ["prototype", "demo"], skills: ["Next.js", "React"], label: "prototype work" },
  { words: ["design", "wireframe", "usability"], skills: ["UX design", "Figma"], label: "design work" },
  { words: ["test"], skills: ["Testing"], label: "testing" },
  { words: ["deploy", "pipeline"], skills: ["GitHub Actions", "CI/CD"], label: "deployment" },
];

const DEVELOPER_SKILLS = ["TypeScript", "Next.js", "React", "Node.js"];

/** Similarity thresholds (see similarity() in text.ts). */
const DUPLICATE = 0.5;
const RELATED = 0.25;

export function shortTitle(text: string): string {
  const clean = text.replace(/\.$/, "").trim();
  for (const sep of [" so ", " with ", " for ", " — ", ", "]) {
    const i = clean.indexOf(sep);
    if (i > 0 && clean.slice(0, i).split(" ").length >= 3) return sentenceCase(clean.slice(0, i));
  }
  return sentenceCase(clean);
}

function suggestOwner(s: S, meeting: Meeting, ap: ActionPoint): { owner: Employee; reason: string } {
  const project = s.projects.find((p) => p.id === meeting.projectId);
  const pool = employees.filter((e) => meeting.participantIds.includes(e.id) && (!project || project.teamIds.includes(e.id)) && e.persona !== "pm" && e.persona !== "lead");
  const hint = SKILL_HINTS.find((h) => includesAny(ap.text, h.words));
  const isBuild = /^(improve|create|add|build|fix|implement|prepare)/i.test(ap.text);

  const scored = pool.map((e) => {
    const matching = hint ? hint.skills.filter((sk) => e.skills.includes(sk)) : [];
    let score = matching.length * 2;
    if (isBuild && hint?.label !== "design work" && e.skills.some((sk) => DEVELOPER_SKILLS.includes(sk))) score += 1;
    if (!e.skills.some((sk) => DEVELOPER_SKILLS.includes(sk)) && isBuild) score -= 2;
    const open = s.tasks.filter((t) => t.assigneeId === e.id && t.status !== "done").length;
    score -= open * 0.25; // spread work: prefer people with fewer open tasks
    // The person asked directly in a recent message about this work is a strong signal.
    const askedDirectly = s.messages.some((m) => m.recipientId === e.id && m.projectId === meeting.projectId && includesAny(m.body, hint?.words ?? []) && !m.archived);
    if (askedDirectly) score += 1.5;
    return { e, score, matching, open, askedDirectly };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) {
    const fallback = employees.find((e) => e.id === s.currentUserId)!;
    return { owner: fallback, reason: "No matching team member found; assigned to you for review." };
  }
  const parts: string[] = [];
  if (best.matching.length) parts.push(`has ${best.matching.join(", ")} skills for ${hint?.label}`);
  if (best.askedDirectly) parts.push("was asked about this in a recent message");
  parts.push(`${best.open} open task${best.open === 1 ? "" : "s"}`);
  return { owner: best.e, reason: `${best.e.firstName} ${parts.join("; ")}.` };
}

/** The next milestone-like meeting of the project (a review or demo), else the next project meeting. */
function nextProjectMeeting(s: S, meeting: Meeting): Meeting | undefined {
  const upcoming = s.meetings
    .filter((m) => m.projectId && m.projectId === meeting.projectId && m.start > meeting.end)
    .sort((a, b) => a.start.localeCompare(b.start));
  return upcoming.find((m) => /review|demo|steering/i.test(m.title)) ?? upcoming[0];
}

/** Subtract working days (skip weekends) from a date. */
function minusWorkdays(date: ISODate, n: number): ISODate {
  let d = date;
  let left = n;
  while (left > 0) {
    d = addDaysISO(d, -1);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return d;
}

function plusWorkdays(date: ISODate, n: number): ISODate {
  let d = date;
  let left = n;
  while (left > 0) {
    d = addDaysISO(d, 1);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return d;
}

export function generateActionPlan(s: S, meetingId: ID, today: ISODate = toISODate()): Suggestion[] {
  const meeting = s.meetings.find((m) => m.id === meetingId);
  if (!meeting?.actionPoints?.length) return [];
  const next = nextProjectMeeting(s, meeting);
  const nextDate = next ? dateOf(next.start) : undefined;
  const openTasks = s.tasks.filter((t) => t.status !== "done" && t.projectId === meeting.projectId);
  const projectRepos = s.projects.find((p) => p.id === meeting.projectId)?.repoIds ?? [];
  const openIssues = s.issues.filter((i) => i.state === "open" && projectRepos.includes(i.repoId));

  return meeting.actionPoints.map((ap, idx) => {
    const { owner, reason: ownerReason } = suggestOwner(s, meeting, ap);
    const title = shortTitle(ap.text);
    const raisedBy = employees.find((e) => e.id === ap.mentionedBy)?.firstName ?? "Someone";

    // Priority
    let priority: Priority = "medium";
    let priorityReason = "Normal follow-up from the meeting.";
    if (includesAny(ap.text, ["can't", "cannot", "double", "blocker", "maintenance"])) {
      priority = "urgent";
      priorityReason = "Linked to a high-severity project risk (reservations of equipment in maintenance).";
    } else if (includesAny(ap.text, ["prototype", "review"]) && nextDate) {
      priority = "high";
      priorityReason = `Needed for ${next!.title} on ${formatDate(nextDate)}.`;
    } else if (includesAny(ap.text, ["confirmation"])) {
      priority = "high";
      priorityReason = "Users re-book without a confirmation (medium risk), and the review is close.";
    }

    // Deadline
    let due = plusWorkdays(today, 5);
    let dueReason = "Default: one working week.";
    if (nextDate && (priority === "urgent" || priority === "high")) {
      due = minusWorkdays(nextDate, 1) < today ? today : minusWorkdays(nextDate, 1);
      dueReason = `One working day before ${next!.title}, so there is time to test.`;
    } else if (includesAny(ap.text, ["approval"])) {
      due = plusWorkdays(today, 8);
      dueReason = "After the prototype review, before the pilot milestone.";
    }

    // Duplicate detection against open tasks and issues of the same project.
    // Strong overlap = likely the same work; weaker overlap = related work worth knowing about.
    const candidates = [
      ...openTasks.map((t) => ({ kind: "task" as const, id: t.id, label: t.title, hasTask: true, score: similarity(ap.text, `${t.title} ${t.description}`) })),
      ...openIssues.map((i) => {
        const score = similarity(ap.text, `${i.title} ${i.body}`);
        // An issue that already has a task is represented by that task (the work is owned).
        const task = i.taskId ? openTasks.find((t) => t.id === i.taskId) : undefined;
        return task
          ? { kind: "task" as const, id: task.id, label: `${task.title} (#${i.number})`, hasTask: true, score }
          : { kind: "issue" as const, id: i.id, label: `#${i.number} ${i.title}`, hasTask: false, score };
      }),
    ]
      .sort((a, b) => b.score - a.score)
      .filter((x, idx, arr) => arr.findIndex((y) => y.id === x.id) === idx);
    const best = candidates[0];
    const duplicate: Suggestion["duplicate"] = best && best.score >= DUPLICATE ? { kind: best.kind, id: best.id, label: best.label, score: best.score } : undefined;
    const related = candidates.filter((x) => x.score >= RELATED && x.id !== duplicate?.id).slice(0, 3).map(({ kind, id, label }) => ({ kind, id, label }));
    const linkable = !duplicate ? candidates.find((x) => x.kind === "issue" && !x.hasTask && x.score >= RELATED) : undefined;

    let description = `${sentenceCase(ap.text)}\n\nRaised by ${raisedBy} at ${ap.timestamp} in “${meeting.title}”.`;
    if (includesAny(ap.text, ["approval"])) {
      description += "\n\nTip: the Internal Process Automation team offers a reusable approval connector — consider reusing it instead of building approvals from scratch.";
    }

    const confidence = Math.round((0.7 + (ownerReason.includes("skills") ? 0.15 : 0) + (duplicate ? -0.1 : 0.05)) * 100) / 100;

    return {
      id: `sg-${meeting.id}-${idx}`,
      actionPointId: ap.id,
      title,
      description,
      projectId: meeting.projectId,
      ownerId: owner.id,
      ownerReason,
      priority,
      priorityReason,
      due,
      dueReason,
      duplicate,
      related,
      linkIssue: linkable ? { id: linkable.id, label: linkable.label } : undefined,
      confidence,
    };
  });
}
