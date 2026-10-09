import { courses, documents, repositories } from "../../data/catalog";
import { employees } from "../../data/people";
import { entriesForWeek, formatHours, hoursByProject, totalHours, weekStatus } from "../../hours";
import { canViewDocument, canViewMeeting, canViewProject } from "../../permissions";
import {
  attentionMessages,
  employeeById,
  me,
  meetingsOn,
  myActivity,
  myMeetings,
  myOpenTasks,
  myProjects,
  overdueTasks,
  pendingApprovals,
  projectProgress,
  todaysPriorities,
  visiblePullRequests,
  type S,
} from "../../selectors";
import { addDaysISO, dateOf, formatDate, formatTime, mondayOf, toISODate, weekDates } from "../../time";
import type { AssistantAction, Employee, ID, KnowledgeDocument, Meeting, Project, ProposedAction, SourceCard, Task } from "../../types";
import { uid } from "../../utils-id";
import { projectInsights, similarProjects } from "../insights";
import { learningRecommendations } from "../learning";
import { generateActionPlan } from "../meeting-actions";
import { includesAny, list, plural, stems } from "../text";
import { generateWorkSummary } from "../work-summary";
import { detectDay, detectPerson, detectProject, detectSkill } from "./entities";

/**
 * TBI ONE Assistant — demo engine (Mode A).
 *
 * A deterministic intent router: it recognises what is being asked, retrieves the
 * relevant records *that the current user is allowed to see*, and builds an answer
 * with source cards and proposed actions. It does not generate free text with a
 * language model, and the UI labels it as simulated AI.
 */

export interface AssistantPage {
  kind: "project" | "meeting" | "document" | "message" | "page";
  id?: ID;
  label: string;
}

export interface AssistantReply {
  intent: string;
  text: string;
  sources?: SourceCard[];
  actions?: AssistantAction[];
  followUps?: string[];
}

interface Ctx {
  s: S;
  q: string;
  page: AssistantPage | null;
  now: Date;
  today: string;
  user: Employee;
}

// ─── Source card helpers ──────────────────────────────────────────────────────
const src = {
  project: (p: Project): SourceCard => ({ kind: "project", id: p.id, title: p.name, subtitle: `${p.code} · ${p.status.replace("-", " ")}`, href: `/projects/${p.id}` }),
  task: (t: Task, s: S): SourceCard => ({ kind: "task", id: t.id, title: t.title, subtitle: [s.projects.find((p) => p.id === t.projectId)?.name, t.due ? `due ${formatDate(t.due, "d MMM")}` : ""].filter(Boolean).join(" · "), href: `/tasks?task=${t.id}` }),
  meeting: (m: Meeting): SourceCard => ({ kind: "meeting", id: m.id, title: m.title, subtitle: formatDate(m.start, "EEE d MMM, HH:mm"), href: `/calendar/${m.id}` }),
  doc: (d: KnowledgeDocument): SourceCard => ({ kind: "document", id: d.id, title: d.title, subtitle: `${d.source} · updated ${formatDate(d.updatedAt, "d MMM")}`, href: `/knowledge?doc=${d.id}` }),
  person: (e: Employee): SourceCard => ({ kind: "person", id: e.id, title: e.name, subtitle: e.role, href: `/people?person=${e.id}` }),
};

const action = (label: string, a: ProposedAction): AssistantAction => ({ id: uid("act"), label, action: a, status: "proposed" });
const nav = (label: string, href: string) => action(label, { kind: "navigate", href, label });

function contextProject(c: Ctx): Project | undefined {
  const fromText = detectProject(c.s, c.q);
  if (fromText) return fromText;
  if (c.page?.kind === "project") return c.s.projects.find((p) => p.id === c.page!.id);
  if (c.page?.kind === "meeting") {
    const m = c.s.meetings.find((x) => x.id === c.page!.id);
    return c.s.projects.find((p) => p.id === m?.projectId);
  }
  if (c.page?.kind === "message") {
    const m = c.s.messages.find((x) => x.id === c.page!.id);
    return c.s.projects.find((p) => p.id === m?.projectId);
  }
  return undefined;
}

/** Standard answer when a project is restricted for this user: no details, but a way forward. */
function restricted(c: Ctx, p: Project): AssistantReply {
  const approver = employeeById(p.approverId);
  const owner = employeeById(p.ownerId);
  const pending = c.s.accessRequests.some((r) => r.requesterId === c.user.id && r.resourceId === p.id && r.status === "pending");
  return {
    intent: "restricted",
    text: `**${p.name}** is a restricted project and you don't have access, so I can't share its details, tasks or documents.\n\nThe owner is ${owner?.name}. Access requests are decided by **${approver?.name}** (${approver?.role}).${pending ? "\n\nYou already have a pending request for this project." : ""}`,
    sources: [{ kind: "project", id: p.id, title: p.name, subtitle: "Restricted", href: `/projects/${p.id}` }, src.person(approver!)],
    actions: pending
      ? [nav("View my requests", "/requests")]
      : [action("Prepare access request", { kind: "access-request", resourceType: "project", resourceId: p.id, reason: `I would like access to ${p.name} for my work as ${c.user.role}.` })],
  };
}

// ─── Intent handlers ──────────────────────────────────────────────────────────

function focusToday(c: Ctx): AssistantReply {
  const tasks = todaysPriorities(c.s, c.today).slice(0, 3);
  const meetings = meetingsOn(c.s, c.today).filter((m) => new Date(m.end) > c.now);
  const attention = attentionMessages(c.s);
  const reasons = tasks.map((t, i) => {
    const why: string[] = [];
    if (t.due && t.due < c.today) why.push("overdue");
    else if (t.due === c.today) why.push("due today");
    else if (t.due) why.push(`due ${formatDate(t.due, "EEE")}`);
    if (t.priority === "urgent") why.push("urgent");
    if (t.tags.includes("blocker")) why.push("blocks the team");
    if (t.status === "in-progress") why.push("already in progress");
    return `${i + 1}. **${t.title}** — ${why.join(", ") || t.priority + " priority"}`;
  });
  const parts = [
    tasks.length ? `Here's what I'd focus on today, ${c.user.firstName}:\n\n${reasons.join("\n")}` : "You have no open tasks. A good moment to pick up learning or help a teammate.",
  ];
  if (meetings.length) parts.push(`You also have ${plural(meetings.length, "meeting")} left today: ${list(meetings.map((m) => `${m.title} (${formatTime(m.start)})`))}. Plan focus time around them.`);
  if (attention.length) parts.push(`${plural(attention.length, "message")} need${attention.length === 1 ? "s" : ""} a response — the first is “${attention[0].subject}”.`);
  const plan = c.s.meetings.find((m) => m.participantIds.includes(c.user.id) && m.actionPoints?.length && !m.actionPlanCreatedAt && new Date(m.end) < c.now);
  if (plan) parts.push(`Tip: “${plan.title}” still has ${plural(plan.actionPoints!.length, "action point")} that aren't tasks yet.`);
  return {
    intent: "focus",
    text: parts.join("\n\n"),
    sources: [...tasks.map((t) => src.task(t, c.s)), ...meetings.slice(0, 2).map(src.meeting)],
    actions: [nav("Open my tasks", "/tasks"), ...(plan ? [nav("Generate action plan", `/calendar/${plan.id}?plan=1`)] : [])],
    followUps: ["Which emails need my response?", "What meetings do I have tomorrow?", "What did I complete this week?"],
  };
}

function urgent(c: Ctx): AssistantReply {
  const tasks = myOpenTasks(c.s).filter((t) => t.priority === "urgent" || t.priority === "high" || (t.due && t.due <= c.today));
  if (!tasks.length) return { intent: "urgent", text: "You have no urgent or overdue tasks right now. 🎉", actions: [nav("Open my tasks", "/tasks")] };
  return {
    intent: "urgent",
    text: `You have ${plural(tasks.length, "urgent or time-critical task")}:\n\n${tasks.map((t) => `- **${t.title}** (${t.priority}${t.due ? `, due ${formatDate(t.due, "EEE d MMM")}` : ""})`).join("\n")}`,
    sources: tasks.slice(0, 5).map((t) => src.task(t, c.s)),
    actions: [nav("Open my tasks", "/tasks")],
  };
}

function meetingsFor(c: Ctx): AssistantReply {
  const day = detectDay(c.q, c.now);
  if (/this week|week/.test(c.q.toLowerCase()) && !day) {
    const days = new Set(weekDates(mondayOf(c.today)));
    const ms = myMeetings(c.s).filter((m) => days.has(dateOf(m.start)));
    return {
      intent: "meetings",
      text: `You have ${plural(ms.length, "meeting")} this week:\n\n${ms.map((m) => `- ${formatDate(m.start, "EEE HH:mm")} — **${m.title}**`).join("\n")}`,
      sources: ms.slice(0, 6).map(src.meeting),
      actions: [nav("Open calendar", "/calendar")],
    };
  }
  const target = day ?? { date: c.today, label: "today" };
  const ms = meetingsOn(c.s, target.date);
  if (!ms.length) return { intent: "meetings", text: `You have no meetings ${target.label}. Good day for focused work.`, actions: [nav("Open calendar", "/calendar")] };
  return {
    intent: "meetings",
    text: `You have ${plural(ms.length, "meeting")} ${target.label}:\n\n${ms
      .map((m) => `- ${formatTime(m.start)}–${formatTime(m.end)} **${m.title}**${m.projectId ? ` · ${c.s.projects.find((p) => p.id === m.projectId)?.name}` : ""}`)
      .join("\n")}`,
    sources: ms.map(src.meeting),
    actions: [nav("Open calendar", "/calendar")],
    followUps: ms.some((m) => m.agenda.length) ? ["How should I prepare for my next meeting?"] : undefined,
  };
}

function lastMeeting(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (p && !canViewProject(c.s, c.user.id, p)) return restricted(c, p);
  const day = detectDay(c.q, c.now);
  let meeting: Meeting | undefined;
  if (c.page?.kind === "meeting") meeting = c.s.meetings.find((m) => m.id === c.page!.id);
  if (!meeting) {
    const past = c.s.meetings
      .filter((m) => canViewMeeting(c.s, c.user.id, m) && m.summary && new Date(m.end) < c.now)
      .filter((m) => (!p || m.projectId === p.id) && (!day || dateOf(m.start) === day.date || (day.label === "yesterday" && dateOf(m.start) < c.today)))
      .sort((a, b) => b.start.localeCompare(a.start));
    meeting = past.find((m) => m.participantIds.includes(c.user.id)) ?? past[0];
  }
  if (!meeting?.summary) return { intent: "last-meeting", text: `I couldn't find a meeting summary${p ? ` for ${p.name}` : ""}. Summaries are only available for meetings that were recorded and summarised.` };
  const parts = [`**${meeting.title}** (${formatDate(meeting.start, "EEE d MMM, HH:mm")})\n\n${meeting.summary}`];
  if (meeting.decisions?.length) parts.push(`**Decisions**\n${meeting.decisions.map((d) => `- ${d}`).join("\n")}`);
  if (meeting.actionPoints?.length) parts.push(`**Action points**\n${meeting.actionPoints.map((a) => `- ${a.text}`).join("\n")}`);
  const done = meeting.actionPlanCreatedAt;
  if (meeting.actionPoints?.length) parts.push(done ? `These action points were already turned into ${plural(meeting.followUpTaskIds.length, "task")}.` : "These action points are not tasks yet.");
  return {
    intent: "last-meeting",
    text: parts.join("\n\n"),
    sources: [src.meeting(meeting), ...(meeting.projectId ? [src.project(c.s.projects.find((x) => x.id === meeting!.projectId)!)] : [])],
    actions: meeting.actionPoints?.length && !done ? [nav("Generate action plan", `/calendar/${meeting.id}?plan=1`)] : [nav("Open meeting", `/calendar/${meeting.id}`)],
    followUps: meeting.actionPoints?.length && !done ? ["Create tasks from this meeting"] : undefined,
  };
}

function tasksFromMeeting(c: Ctx): AssistantReply {
  let meeting = c.page?.kind === "meeting" ? c.s.meetings.find((m) => m.id === c.page!.id) : undefined;
  meeting ??= c.s.meetings
    .filter((m) => m.participantIds.includes(c.user.id) && m.actionPoints?.length && new Date(m.end) < c.now)
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  if (!meeting?.actionPoints?.length) return { intent: "meeting-tasks", text: "I couldn't find a recent meeting with action points. Open a meeting and ask again." };
  if (meeting.actionPlanCreatedAt) {
    const tasks = c.s.tasks.filter((t) => meeting!.followUpTaskIds.includes(t.id));
    return { intent: "meeting-tasks", text: `Tasks from **${meeting.title}** were already created:\n\n${tasks.map((t) => `- ${t.title} → ${employeeById(t.assigneeId)?.firstName}`).join("\n")}`, sources: tasks.map((t) => src.task(t, c.s)) };
  }
  const suggestions = generateActionPlan(c.s, meeting.id, c.today);
  return {
    intent: "meeting-tasks",
    text: `I found ${plural(suggestions.length, "action point")} in **${meeting.title}**. Review each suggestion — nothing is created until you confirm. For full editing (owner, deadline, GitHub issue), use the action plan on the meeting page.\n\n${suggestions
      .map((sg) => `- **${sg.title}** → ${employeeById(sg.ownerId)?.firstName}, ${sg.priority}, due ${formatDate(sg.due, "EEE d MMM")}${sg.duplicate ? ` ⚠️ possible duplicate of “${sg.duplicate.label}”` : ""}`)
      .join("\n")}`,
    sources: [src.meeting(meeting)],
    actions: [
      nav("Review full action plan", `/calendar/${meeting.id}?plan=1`),
      ...suggestions
        .filter((sg) => !sg.duplicate)
        .map((sg) =>
          action(`Create task: ${sg.title}`, {
            kind: "create-task",
            task: { title: sg.title, description: sg.description, projectId: sg.projectId, assigneeId: sg.ownerId, priority: sg.priority, due: sg.due, source: { type: "meeting", id: meeting!.id } },
          }),
        ),
    ],
  };
}

function catchUp(c: Ctx): AssistantReply {
  const since = new Date(c.now.getTime() - 24 * 3600000).toISOString();
  const items = myActivity(c.s).filter((a) => a.actorId !== c.user.id && a.at >= since);
  const unread = c.s.messages.filter((m) => m.recipientId === c.user.id && !m.read && !m.archived);
  const text = [
    items.length ? `In the last 24 hours:\n\n${items.slice(0, 6).map((a) => `- **${employeeById(a.actorId)?.firstName}** ${a.text}`).join("\n")}` : "Nothing new happened in your projects in the last 24 hours.",
    unread.length ? `You have ${plural(unread.length, "unread message")}, including “${unread[0].subject}”.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { intent: "catch-up", text, actions: [nav("Open inbox", "/inbox")], followUps: ["What should I focus on today?"] };
}

function completedWeek(c: Ctx): AssistantReply {
  const days = new Set(weekDates(mondayOf(c.today)));
  const done = c.s.tasks.filter((t) => t.assigneeId === c.user.id && t.status === "done" && t.completedAt && days.has(dateOf(t.completedAt)));
  const prs = c.s.pullRequests.filter((p) => p.authorId === c.user.id && days.has(dateOf(p.createdAt)));
  const lessons = c.s.activity.filter((a) => a.actorId === c.user.id && a.source === "learning" && days.has(dateOf(a.at)));
  if (!done.length && !prs.length && !lessons.length)
    return { intent: "completed", text: "I don't see completed work recorded this week yet. Completed tasks, pull requests and lessons show up here automatically.", actions: [nav("Open my tasks", "/tasks")] };
  return {
    intent: "completed",
    text: `This week you:\n\n${[
      ...done.map((t) => `- Completed **${t.title}**`),
      ...prs.map((p) => `- Opened pull request #${p.number} ${p.title}`),
      ...(lessons.length ? [`- Completed ${plural(lessons.length, "lesson")}`] : []),
    ].join("\n")}\n\nWant me to turn this into a logbook draft?`,
    sources: done.map((t) => src.task(t, c.s)),
    actions: [nav("Generate my work summary", "/logbook?generate=1")],
  };
}

function projectProgressReply(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (p) {
    if (!canViewProject(c.s, c.user.id, p)) return restricted(c, p);
    const tasks = c.s.tasks.filter((t) => t.projectId === p.id);
    const done = tasks.filter((t) => t.status === "done").length;
    const nextMs = p.milestones.filter((m) => !m.done).sort((a, b) => a.due.localeCompare(b.due))[0];
    const blockers = p.risks.filter((r) => r.isBlocker);
    return {
      intent: "progress",
      text: `**${p.name}** is **${projectProgress(c.s, p)}%** complete and ${p.status === "on-track" ? "on track" : `**${p.status.replace("-", " ")}**`}.\n\n- ${done} of ${tasks.length} tasks done, ${p.milestones.filter((m) => m.done).length} of ${p.milestones.length} milestones reached\n${nextMs ? `- Next milestone: **${nextMs.title}** (${formatDate(nextMs.due, "EEE d MMM")})\n` : ""}${blockers.length ? `- Blocker: ${blockers.map((b) => b.title).join("; ")}` : "- No blockers"}`,
      sources: [src.project(p)],
      actions: [nav("Open project", `/projects/${p.id}`)],
      followUps: [`What are the blockers for ${p.name}?`, `What improvements do you recommend for ${p.name}?`],
    };
  }
  const projects = myProjects(c.s);
  return {
    intent: "progress",
    text: `Your projects:\n\n${projects.map((x) => `- **${x.name}** — ${projectProgress(c.s, x)}%, ${x.status.replace("-", " ")}`).join("\n")}`,
    sources: projects.map(src.project),
    actions: [nav("Open projects", "/projects")],
  };
}

function blockers(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (p && !canViewProject(c.s, c.user.id, p)) return restricted(c, p);
  const scope = p ? [p] : myProjects(c.s);
  const rows = scope.flatMap((x) => x.risks.filter((r) => r.isBlocker || r.severity === "high").map((r) => ({ p: x, r })));
  const overdue = scope.flatMap((x) => overdueTasks(c.s, x.id, c.today));
  if (!rows.length && !overdue.length) return { intent: "blockers", text: `No blockers or high risks${p ? ` in ${p.name}` : " in your projects"}.` };
  return {
    intent: "blockers",
    text: `${rows.length ? `**Blockers and high risks**\n${rows.map(({ p: x, r }) => `- ${x.name}: **${r.title}**${r.mitigation ? ` — mitigation: ${r.mitigation}` : ""}`).join("\n")}` : ""}${overdue.length ? `\n\n**Overdue tasks**\n${overdue.map((t) => `- ${t.title} (${employeeById(t.assigneeId)?.firstName}, due ${formatDate(t.due!, "d MMM")})`).join("\n")}` : ""}`.trim(),
    sources: scope.map(src.project),
    followUps: p ? [`What improvements do you recommend for ${p.name}?`] : undefined,
  };
}

function improvements(c: Ctx): AssistantReply {
  const p = contextProject(c) ?? myProjects(c.s)[0];
  if (!p) return { intent: "improvements", text: "Which project do you mean? Open a project or mention its name." };
  if (!canViewProject(c.s, c.user.id, p)) return restricted(c, p);
  const ins = projectInsights(c.s, p.id, c.today);
  if (!ins.length) return { intent: "improvements", text: `I don't see clear improvement opportunities for ${p.name} in the current data.` };
  return {
    intent: "improvements",
    text: `Based on ${p.name}'s objectives, tasks, risks, decisions and issues, I'd consider:\n\n${ins
      .slice(0, 4)
      .map((i, n) => `${n + 1}. **${i.title}** — ${i.why}`)
      .join("\n")}\n\nEach suggestion lists its evidence on the project's AI Insights tab.`,
    sources: [src.project(p)],
    actions: [
      nav("Open AI Insights", `/projects/${p.id}?tab=insights`),
      ...ins.slice(0, 2).map((i) => action(`Create task: ${i.task.title}`, { kind: "create-task", task: { ...i.task, projectId: p.id, assigneeId: c.user.id, source: { type: "insight", id: i.id } } })),
    ],
  };
}

function similar(c: Ctx): AssistantReply {
  const p = contextProject(c) ?? myProjects(c.s)[0];
  if (!p) return { intent: "similar", text: "Which project do you mean?" };
  if (!canViewProject(c.s, c.user.id, p)) return restricted(c, p);
  const sims = similarProjects(c.s, p).filter((x) => canViewProject(c.s, c.user.id, x.project)).slice(0, 3);
  return {
    intent: "similar",
    text: sims.length ? `Projects similar to **${p.name}**:\n\n${sims.map((x) => `- **${x.project.name}** — shares ${list(x.shared)}`).join("\n")}\n\nTheir teams may have solved problems you're facing.` : `I found no similar projects you can access.`,
    sources: sims.map((x) => src.project(x.project)),
  };
}

function findDocument(c: Ctx): AssistantReply {
  const qs = stems(c.q);
  const score = (d: KnowledgeDocument) => {
    let sc = 0;
    for (const tag of d.tags) if ([...stems(tag)].every((w) => qs.has(w))) sc += 3;
    for (const w of stems(d.title)) if (qs.has(w)) sc += 2;
    for (const w of stems(d.summary)) if (qs.has(w)) sc += 0.5;
    return sc;
  };
  const ranked = documents.map((d) => ({ d, sc: score(d) })).filter((x) => x.sc >= 2).sort((a, b) => b.sc - a.sc);
  const allowed = ranked.filter((x) => canViewDocument(c.s, c.user.id, x.d));
  const blocked = ranked.filter((x) => !canViewDocument(c.s, c.user.id, x.d));
  if (!allowed.length) {
    if (blocked.length) {
      const d = blocked[0].d;
      return {
        intent: "document",
        text: `The best match is **${d.title}**, but it's restricted and I can't show its contents. You can request access.`,
        sources: [{ kind: "document", id: d.id, title: d.title, subtitle: "Restricted", href: `/knowledge?doc=${d.id}` }],
        actions: [action("Prepare access request", { kind: "access-request", resourceType: "document", resourceId: d.id, reason: `I need ${d.title} for my work as ${c.user.role}.` })],
      };
    }
    if (!/(document|report|procedure|guide|handbook|policy|guideline|onboarding|find|where)/i.test(c.q)) return help(c);
    return { intent: "document", text: "I couldn't find a document about that in the knowledge base you have access to. Try the Knowledge page search, or ask a colleague who owns the topic.", actions: [nav("Open knowledge", "/knowledge")] };
  }
  const best = allowed[0].d;
  const section = best.sections
    .map((sec) => ({ sec, sc: [...stems(`${sec.heading} ${sec.body}`)].filter((w) => qs.has(w)).length }))
    .sort((a, b) => b.sc - a.sc)[0]?.sec;
  const others = allowed.slice(1, 3).map((x) => x.d);
  return {
    intent: "document",
    text: `You can find this in **${best.title}** (${best.source}).\n\n${best.summary}${section ? `\n\n**${section.heading}:** ${section.body}` : ""}${others.length ? `\n\nAlso relevant: ${list(others.map((o) => o.title))}.` : ""}${blocked.length ? "\n\n_One more matching document is restricted; I've left it out._" : ""}`,
    sources: [src.doc(best), ...others.map(src.doc)],
    actions: [nav("Open document", `/knowledge?doc=${best.id}`)],
  };
}

function beforeStarting(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (!p) return findDocument({ ...c, q: `${c.q} onboarding` });
  if (!canViewProject(c.s, c.user.id, p)) return restricted(c, p);
  const docs = documents.filter((d) => d.projectIds.includes(p.id) && canViewDocument(c.s, c.user.id, d));
  const owner = employeeById(p.ownerId)!;
  const lastM = c.s.meetings.filter((m) => m.projectId === p.id && m.summary && new Date(m.end) < c.now).sort((a, b) => b.start.localeCompare(a.start))[0];
  return {
    intent: "before-starting",
    text: `Before starting on **${p.name}**:\n\n- **Goal:** ${p.description}\n- **Objectives:** ${list(p.objectives)}\n- **Technologies:** ${list(p.technologies)}\n- **Owner:** ${owner.name}; team: ${list(p.teamIds.map((id) => employeeById(id)!.firstName))}\n${p.risks.length ? `- **Watch out for:** ${p.risks[0].title}\n` : ""}${lastM ? `- **Latest meeting:** ${lastM.title}\n` : ""}${docs.length ? `\nRead first: ${list(docs.map((d) => d.title))}.` : ""}`,
    sources: [src.project(p), ...docs.map(src.doc), ...(lastM ? [src.meeting(lastM)] : [])],
    followUps: ["What should I learn for this project?"],
  };
}

function whoKnows(c: Ctx): AssistantReply {
  const skill = detectSkill(c.q);
  if (!skill) return { intent: "people", text: "Which topic or skill are you looking for? For example: “Who knows about Azure?”", actions: [nav("Open people directory", "/people")] };
  const matches = employees
    .filter((e) => e.id !== c.user.id)
    .map((e) => ({ e, hits: e.skills.filter((sk) => skill.skills.some((x) => sk.toLowerCase().includes(x.toLowerCase()))) }))
    .filter((x) => x.hits.length)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, 3);
  if (!matches.length) return { intent: "people", text: `I couldn't find colleagues with ${skill.term} listed as a skill.`, actions: [nav("Open people directory", "/people")] };
  return {
    intent: "people",
    text: `For **${skill.term}**, I'd ask:\n\n${matches
      .map(({ e, hits }) => {
        const shared = myProjects(c.s).filter((p) => p.teamIds.includes(e.id));
        return `- **${e.name}** (${e.role}) — ${list(hits)}${shared.length ? `; you both work on ${list(shared.map((p) => p.name))}` : ""}. ${e.availability === "available" ? "Available now." : `Currently ${e.availability.replace("-", " ")}.`}`;
      })
      .join("\n")}`,
    sources: matches.map((m) => src.person(m.e)),
    actions: [action(`Draft a Teams message to ${matches[0].e.firstName}`, { kind: "draft-message", channel: "teams", toId: matches[0].e.id, subject: `Question about ${skill.term}`, body: `Hi ${matches[0].e.firstName}, I'm ${c.user.firstName} (${c.user.role}). Could you help me with a question about ${skill.term}? Do you have 15 minutes this week?` })],
  };
}

function ownerOf(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (!p) return { intent: "owner", text: "Which project do you mean? Mention its name or open the project." };
  const owner = employeeById(p.ownerId)!;
  const approver = employeeById(p.approverId)!;
  const pm = employees.find((e) => e.persona === "pm" && p.teamIds.includes(e.id));
  // Ownership is metadata, so it is shown even for restricted projects.
  return {
    intent: "owner",
    text: `**${owner.name}** (${owner.role}) owns ${p.name}.${pm && pm.id !== owner.id ? ` ${pm.name} is the project manager.` : ""} Access requests are decided by ${approver.name}.`,
    sources: [src.person(owner), ...(canViewProject(c.s, c.user.id, p) ? [src.project(p)] : [])],
  };
}

function approver(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (p) {
    const a = employeeById(p.approverId)!;
    const has = canViewProject(c.s, c.user.id, p);
    return {
      intent: "approver",
      text: `Access to **${p.name}** is approved by **${a.name}** (${a.role}).${has ? " You already have access." : p.visibility === "internal" ? " It's an internal project, so you don't need to request access." : ""}`,
      sources: [src.person(a)],
      actions: !has ? [action("Prepare access request", { kind: "access-request", resourceType: "project", resourceId: p.id, reason: `I would like access to ${p.name} for my work as ${c.user.role}.` })] : undefined,
    };
  }
  const mgr = employeeById(c.user.managerId);
  return {
    intent: "approver",
    text: mgr
      ? `For most requests (hours, equipment loans over 3 days, access to team projects) your manager **${mgr.name}** approves. Restricted projects each have their own approver — mention the project and I'll look it up.`
      : "You approve requests for your own team. Restricted projects each have their own approver.",
    sources: mgr ? [src.person(mgr)] : undefined,
  };
}

function reviewer(c: Ctx): AssistantReply {
  const p = contextProject(c) ?? myProjects(c.s)[0];
  const pool = employees.filter((e) => e.id !== c.user.id && (p ? p.teamIds.includes(e.id) : true));
  const code = pool.filter((e) => e.skills.includes("Code review") || e.skills.includes("TypeScript"));
  const ux = pool.filter((e) => e.skills.includes("UX design"));
  const picks = [...code.slice(0, 1), ...ux.slice(0, 1)];
  if (!picks.length) return { intent: "reviewer", text: "I couldn't find a suitable reviewer on this project." };
  return {
    intent: "reviewer",
    text: `For a review${p ? ` in ${p.name}` : ""}:\n\n${picks.map((e) => `- **${e.name}** — ${e.skills.includes("UX design") ? "for the user experience and accessibility" : "for the code and technical approach"}`).join("\n")}\n\nThe Development Guidelines say at least one reviewer approves before merging.`,
    sources: [...picks.map(src.person), src.doc(documents.find((d) => d.id === "d-devguide")!)],
  };
}

function emails(c: Ctx): AssistantReply {
  const msgs = attentionMessages(c.s);
  if (!msgs.length) return { intent: "messages", text: "Nothing in your inbox needs a response right now.", actions: [nav("Open inbox", "/inbox")] };
  return {
    intent: "messages",
    text: `${plural(msgs.length, "message")} need${msgs.length === 1 ? "s" : ""} your attention:\n\n${msgs
      .slice(0, 6)
      .map((m) => `- **${m.subject}** — ${employeeById(m.fromId)?.firstName ?? m.fromName} (${m.channel === "outlook" ? "Outlook" : m.channel === "teams" ? "Teams" : m.channel})`)
      .join("\n")}`,
    sources: msgs.slice(0, 4).map((m) => ({ kind: "message" as const, id: m.id, title: m.subject, subtitle: employeeById(m.fromId)?.name ?? m.fromName, href: `/inbox?m=${m.id}` })),
    actions: [nav("Open inbox (needs action)", "/inbox?filter=action")],
  };
}

function draftIssue(c: Ctx): AssistantReply {
  let title = "";
  let body = "";
  let repoId: string | undefined;
  let taskId: string | undefined;
  const p = contextProject(c);
  if (c.page?.kind === "message") {
    const m = c.s.messages.find((x) => x.id === c.page!.id);
    if (m) {
      title = m.subject.replace(/^(re:|fw:)\s*/i, "");
      body = `${m.body}\n\nSource: message from ${employeeById(m.fromId)?.name ?? m.fromName}.`;
    }
  }
  if (!title) {
    const t = myOpenTasks(c.s).find((x) => !x.githubIssueId && x.projectId && (!p || x.projectId === p.id));
    if (t) {
      title = t.title;
      body = t.description || `Created from task “${t.title}”.`;
      taskId = t.id;
      repoId = c.s.projects.find((x) => x.id === t.projectId)?.repoIds[0];
    }
  }
  repoId ??= p?.repoIds[0] ?? myProjects(c.s)[0]?.repoIds[0];
  if (!title || !repoId) return { intent: "draft-issue", text: "Tell me what the issue should be about, or open the task, message or meeting it relates to.", actions: [nav("Open GitHub workspace", "/github")] };
  const repo = repositories.find((r) => r.id === repoId)!;
  return {
    intent: "draft-issue",
    text: `Here's a draft issue for **${repo.fullName}** (simulated — nothing is sent to GitHub):\n\n**${title}**\n\n${body}\n\nConfirm to create it in the demo workspace.`,
    actions: [action(`Create issue in ${repo.name}`, { kind: "create-issue", issue: { repoId, title, body, labels: ["from-assistant"], assigneeId: c.user.id, taskId } })],
  };
}

function draftMessage(c: Ctx): AssistantReply {
  const lower = c.q.toLowerCase();
  const toSupervisor = includesAny(lower, ["supervisor", "manager", "team lead", "mentor"]);
  let to = toSupervisor ? employeeById(c.user.managerId) : detectPerson(c.q, c.user.id);
  const msg = c.page?.kind === "message" ? c.s.messages.find((m) => m.id === c.page!.id) : undefined;
  if (!to && msg?.fromId) to = employeeById(msg.fromId);
  if (!to) to = employeeById(c.user.managerId);
  if (!to) return { intent: "draft-message", text: "Who should the message go to?" };
  const channel = includesAny(lower, ["email", "mail", "outlook"]) ? "outlook" : "teams";
  const done = c.s.tasks.filter((t) => t.assigneeId === c.user.id && t.status === "done" && t.completedAt && t.completedAt >= addDaysISO(c.today, -7)).slice(0, 3);
  const doing = myOpenTasks(c.s).slice(0, 2);
  const body = msg && to.id === msg.fromId
    ? `Hi ${to.firstName}, thanks for your message about “${msg.subject}”. I'm on it and will get back to you ${doing[0]?.due ? `before ${formatDate(doing[0].due, "EEEE")}` : "this week"}.`
    : `Hi ${to.firstName},\n\nA short update from my side:\n${done.length ? `- Done: ${list(done.map((t) => t.title))}\n` : ""}${doing.length ? `- Working on: ${list(doing.map((t) => t.title))}\n` : ""}\nCould we discuss this during our next check-in?\n\nKind regards,\n${c.user.firstName}`;
  return {
    intent: "draft-message",
    text: `Here's a draft ${channel === "outlook" ? "email" : "Teams message"} to **${to.name}**. Edit it as you like — TBI ONE never sends messages in this demo.`,
    sources: [src.person(to)],
    actions: [action(`Use draft for ${to.firstName}`, { kind: "draft-message", channel, toId: to.id, subject: msg ? `Re: ${msg.subject}` : "Update", body })],
  };
}

function workSummary(c: Ctx): AssistantReply {
  const ws = generateWorkSummary(c.s, c.user.id, mondayOf(c.today));
  return {
    intent: "work-summary",
    text: `I can draft your weekly logbook from what's recorded: ${ws.facts.map((f) => `${f.label.toLowerCase()}: ${f.value}`).join(", ")}.\n\nI only use registered hours — I never estimate them. Open the draft to review and edit it before saving.`,
    actions: [nav("Generate my work summary", "/logbook?generate=1")],
  };
}

function hoursReply(c: Ctx): AssistantReply {
  const lower = c.q.toLowerCase();
  const monday = /last week/.test(lower) ? addDaysISO(mondayOf(c.today), -7) : mondayOf(c.today);
  const entries = entriesForWeek(c.s.hours, c.user.id, monday);
  const total = totalHours(entries);
  const byP = hoursByProject(entries);
  const label = monday === mondayOf(c.today) ? "this week" : "last week";
  if (!entries.length) return { intent: "hours", text: `You haven't registered any hours ${label}.`, actions: [nav("Register hours", "/hours")] };
  return {
    intent: "hours",
    text: `You registered **${formatHours(total)}** hours ${label} (status: ${weekStatus(entries)}):\n\n${Object.entries(byP)
      .map(([pid, h]) => `- ${c.s.projects.find((p) => p.id === pid)?.name ?? "Other / learning"}: ${formatHours(h)}`)
      .join("\n")}\n\nThis is based only on your registered entries.`,
    sources: [{ kind: "hours", id: monday, title: `Hours — week of ${formatDate(monday, "d MMM")}`, subtitle: `${entries.length} entries`, href: "/hours" }],
    actions: [nav("Open hours", "/hours")],
  };
}

function learningReply(c: Ctx): AssistantReply {
  const recs = learningRecommendations(c.s, c.user.id);
  if (!recs.length) return { intent: "learning", text: "Your skills match the work you're assigned to. Have a look at the catalogue for new topics.", actions: [nav("Open learning", "/learning")] };
  return {
    intent: "learning",
    text: `Based on your projects and skill gaps:\n\n${recs.map((r) => `- **${r.course.title}** — ${r.reason}`).join("\n")}`,
    sources: recs.map((r) => ({ kind: "course" as const, id: r.course.id, title: r.course.title, subtitle: r.course.provider, href: `/learning?course=${r.course.id}` })),
    actions: [nav("Open learning", "/learning")],
  };
}

function accessRequest(c: Ctx): AssistantReply {
  const p = contextProject(c);
  if (!p) return { intent: "access", text: "Which project or document do you need access to?", actions: [nav("Open requests", "/requests")] };
  if (canViewProject(c.s, c.user.id, p)) return { intent: "access", text: `You already have access to **${p.name}**.`, sources: [src.project(p)] };
  return restricted(c, p);
}

function createTaskFromText(c: Ctx): AssistantReply {
  const m = c.q.match(/(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s*(?:to|for|:)?\s*(.*)$/i);
  const title = (m?.[1] ?? "").trim().replace(/[.?!]$/, "");
  const p = contextProject(c);
  if (!title) return { intent: "create-task", text: "What should the task be? For example: “Create a task to update the README”.", actions: [nav("Open my tasks", "/tasks")] };
  const t = title.charAt(0).toUpperCase() + title.slice(1);
  return {
    intent: "create-task",
    text: `I'll create the task **${t}**${p && canViewProject(c.s, c.user.id, p) ? ` in ${p.name}` : ""}, assigned to you. Confirm below.`,
    actions: [action(`Create task: ${t}`, { kind: "create-task", task: { title: t, description: "Created with the TBI ONE Assistant.", projectId: p && canViewProject(c.s, c.user.id, p) ? p.id : undefined, assigneeId: c.user.id, priority: "medium", source: { type: "assistant" } } })],
  };
}

const PAGES: [RegExp, string, string][] = [
  [/inbox|messages/, "/inbox", "Inbox"],
  [/calendar|agenda/, "/calendar", "Calendar"],
  [/tasks?/, "/tasks", "My Tasks"],
  [/projects?/, "/projects", "Projects"],
  [/github|repos|pull requests/, "/github", "GitHub"],
  [/knowledge|documents?/, "/knowledge", "Knowledge"],
  [/learning|courses?/, "/learning", "Learning"],
  [/logbook/, "/logbook", "Work Logbook"],
  [/hours|timesheet/, "/hours", "Hours"],
  [/requests|approvals/, "/requests", "Requests"],
  [/people|directory/, "/people", "People"],
  [/news/, "/news", "News"],
  [/settings/, "/settings", "Settings"],
];

function navigate(c: Ctx): AssistantReply | undefined {
  const lower = c.q.toLowerCase();
  const p = detectProject(c.s, c.q);
  if (p) return { intent: "navigate", text: `Opening **${p.name}**.`, actions: [nav(`Go to ${p.name}`, `/projects/${p.id}`)] };
  for (const [re, href, label] of PAGES) if (re.test(lower)) return { intent: "navigate", text: `Here's ${label}.`, actions: [nav(`Go to ${label}`, href)] };
  return undefined;
}

function prepareMeeting(c: Ctx): AssistantReply {
  const next = myMeetings(c.s).find((m) => new Date(m.start) > c.now);
  if (!next) return { intent: "prepare", text: "You have no upcoming meetings." };
  const p = c.s.projects.find((x) => x.id === next.projectId);
  const related = p ? myOpenTasks(c.s).filter((t) => t.projectId === p.id) : [];
  const prev = p ? c.s.meetings.filter((m) => m.projectId === p.id && m.summary && new Date(m.end) < c.now).sort((a, b) => b.start.localeCompare(a.start))[0] : undefined;
  return {
    intent: "prepare",
    text: `Your next meeting is **${next.title}** (${formatDate(next.start, "EEE HH:mm")}).\n\n${next.agenda.length ? `**Agenda:** ${list(next.agenda)}\n\n` : ""}${related.length ? `**Your open tasks for this project:** ${list(related.map((t) => `${t.title} (${t.status.replace("-", " ")})`))}\n\n` : ""}${prev ? `**Last time (${prev.title}):** ${prev.decisions?.join(" ") ?? prev.summary}` : ""}`.trim(),
    sources: [src.meeting(next), ...(prev ? [src.meeting(prev)] : [])],
  };
}

function help(c: Ctx): AssistantReply {
  return {
    intent: "help",
    text: `I'm the TBI ONE demo assistant. I answer from the workspace data you're allowed to see, and I always show my sources. I can't answer questions outside this demo's data${c.q ? ` — I didn't recognise “${c.q.slice(0, 80)}”` : ""}.\n\nTry asking about your day, a project, a meeting, documents, colleagues, hours or learning.`,
    followUps: ["What should I focus on today?", "What happened during yesterday's project meeting?", "Who knows about Azure?", "What is the procedure for requesting equipment?"],
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

type Rule = { name: string; test: (q: string, c: Ctx) => boolean; run: (c: Ctx) => AssistantReply };

const RULES: Rule[] = [
  { name: "tasks-from-meeting", test: (q) => /(create|make|turn).*(tasks?|issues?|actions?).*(meeting|this)|action plan/.test(q), run: tasksFromMeeting },
  { name: "draft-issue", test: (q) => /(draft|create|open|write).*(github )?issue/.test(q), run: draftIssue },
  { name: "create-task", test: (q) => /^(please )?(create|add|make)\s+(a\s+)?(new\s+)?task/.test(q), run: createTaskFromText },
  { name: "approver", test: (q) => /who (can|should|will|must)? ?approve|who decides|permission to access|who.*(grant|give).*access/.test(q), run: approver },
  { name: "access", test: (q) => /(access request|request access|prepare.*access|get access|need access)/.test(q), run: accessRequest },
  { name: "draft-message", test: (q) => /(draft|prepare|write|compose).*(reply|message|email|mail|teams)|message for my|reply to/.test(q), run: draftMessage },
  { name: "work-summary", test: (q) => /(logbook|work summary|work log|weekly report)/.test(q), run: workSummary },
  { name: "improvements", test: (q) => /(improve|improvement|recommend|features? should|what should we add|suggestions? for)/.test(q) && !/learn/.test(q), run: improvements },
  { name: "similar", test: (q) => /similar|comparable|like this project/.test(q), run: similar },
  { name: "blockers", test: (q) => /(blocker|blocked|risks?\b|stuck)/.test(q), run: blockers },
  { name: "learning", test: (q) => /(learn|course|training|skill|study|get better)/.test(q) && !/who/.test(q), run: learningReply },
  { name: "hours", test: (q) => /hours|timesheet|how long have i worked|worked this week/.test(q), run: hoursReply },
  { name: "reviewer", test: (q) => /who (can|could|should) review|reviewer/.test(q), run: reviewer },
  { name: "owner", test: (q) => /who('s| is)? (responsible|the owner|owns|leads|in charge)|project owner|who owns/.test(q), run: ownerOf },
  { name: "people", test: (q) => /^who\b|who (knows|has|works|can help|is an expert|should i ask)|expert|experience with/.test(q), run: whoKnows },
  { name: "before-starting", test: (q) => /before (starting|i start|joining)|need to know about|onboard me/.test(q), run: beforeStarting },
  { name: "last-meeting", test: (q) => /(happened|discussed|decided|summary|recap).*(meeting|call|discussion)|last meeting|meeting (summary|notes)|yesterday'?s meeting/.test(q), run: lastMeeting },
  { name: "prepare", test: (q) => /prepare (for|me for).*(meeting)|next meeting/.test(q), run: prepareMeeting },
  { name: "meetings", test: (q) => /meetings?|calendar|agenda|schedule/.test(q) && !/^(open|go to|show)/.test(q), run: meetingsFor },
  { name: "catch-up", test: (q) => /while i was away|catch me up|catch up|what('s| is| has) (new|happened)|missed/.test(q), run: catchUp },
  { name: "completed", test: (q) => /(accomplish|achieved|completed|did i (do|finish|complete)|done this week|finished this week)/.test(q), run: completedWeek },
  { name: "messages", test: (q) => /(email|e-mail|mail|messages?|inbox|respond|response|reply)/.test(q), run: emails },
  { name: "urgent", test: (q) => /urgent|overdue|deadline/.test(q), run: urgent },
  { name: "focus", test: (q) => /(focus|prioriti|work on|start with|what should i do|plan my day|my day|today)/.test(q), run: focusToday },
  { name: "progress", test: (q) => /(progress|status|how is|how's|going)/.test(q), run: projectProgressReply },
  { name: "document", test: (q) => /(where (can|do) i find|where is|document|report|procedure|guide|handbook|policy|how do i|how to|guidelines?|onboarding|quarterly|what is the)/.test(q), run: findDocument },
  { name: "navigate", test: (q) => /^(open|go to|show( me)?|take me to|navigate to)\b/.test(q), run: (c) => navigate(c) ?? help(c) },
];

export function answer(s: S, question: string, page: AssistantPage | null = null, now = new Date()): AssistantReply {
  const q = question.trim().toLowerCase();
  const c: Ctx = { s, q: question.trim(), page, now, today: toISODate(now), user: me(s) };
  if (!q) return help(c);
  // Natural-language navigation wins when the question is clearly a command.
  if (/^(open|go to|take me to|navigate to)\b/.test(q)) {
    const n = navigate(c);
    if (n) return n;
  }
  for (const rule of RULES) {
    if (rule.test(q, c)) return rule.run(c);
  }
  return help(c);
}

/** Exposed for the settings page: which intents the demo engine understands. */
export const SUPPORTED_INTENTS = RULES.map((r) => r.name);

