"use client";

import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Cell } from "recharts";
import {
  Activity as ActivityIcon,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  GitBranch,
  GitPullRequest,
  GraduationCap,
  Inbox,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { morningBriefing } from "@/lib/ai/briefing";
import { courseProgress, learningRecommendations } from "@/lib/ai/learning";
import { courses, documents, repositories } from "@/lib/data/catalog";
import { entriesForWeek, entryHours, formatHours, totalHours, weekStatus } from "@/lib/hours";
import {
  attentionMessages,
  employeeById,
  meetingsOn,
  me,
  myActivity,
  myProjects,
  pendingApprovals,
  projectProgress,
  todaysPriorities,
  visibleProjects,
  visiblePullRequests,
  workload,
  type S,
} from "@/lib/selectors";
import { formatDate, formatTime, mondayOf, relativeDue, timeAgo, weekDates } from "@/lib/time";
import type { WidgetId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { AiBadge, EmptyState, Panel, ProgressBar } from "@/components/common/layout";
import { PersonAvatar, AvatarStack } from "@/components/common/person-avatar";
import { HoursStatusBadge, Pill, PriorityDot, ProjectStatusBadge, SourceIcon, SourceLabel } from "@/components/common/badges";
import { RichText } from "@/components/common/rich-text";

export const WIDGET_META: Record<WidgetId, { title: string; span: 1 | 2 }> = {
  briefing: { title: "AI Morning Briefing", span: 2 },
  priorities: { title: "Today's priorities", span: 1 },
  meetings: { title: "Today's meetings", span: 1 },
  messages: { title: "Needs your attention", span: 1 },
  projects: { title: "Project progress", span: 2 },
  hours: { title: "Hours this week", span: 1 },
  approvals: { title: "Approvals", span: 1 },
  github: { title: "GitHub activity", span: 1 },
  activity: { title: "Activity", span: 1 },
  learning: { title: "Learning", span: 1 },
  team: { title: "Team workload", span: 1 },
};

const viewAll = (href: string, label = "View all") => (
  <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground">
    {label} <ArrowRight className="size-3" />
  </Link>
);

function Briefing({ s }: { s: S }) {
  const b = useMemo(() => morningBriefing(s), [s]);
  const ask = useWorkspace((x) => x.askAssistant);
  return (
    <section className="ai-surface relative flex h-full flex-col overflow-hidden rounded-xl border shadow-card" data-testid="briefing">
      <div className="flex items-center justify-between gap-3 border-b border-ai/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="size-4 text-ai" aria-hidden /> Your AI Morning Briefing
        </h2>
        <AiBadge />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <ul className="space-y-2.5">
          {b.lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", l.tone === "warning" ? "bg-warning" : l.tone === "positive" ? "bg-success" : "bg-ai")} aria-hidden />
              {l.href ? (
                <Link href={l.href} className="leading-relaxed text-foreground/90 underline-offset-4 hover:text-foreground hover:underline">
                  <RichText text={l.text} className="inline" />
                </Link>
              ) : (
                <span className="leading-relaxed">{l.text}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Button size="sm" variant="outline" className="bg-card/70" onClick={() => ask("What should I focus on today?")} data-testid="briefing-ask">
            <Sparkles className="text-ai" /> What should I focus on?
          </Button>
          <Button size="sm" variant="ghost" onClick={() => ask("What happened while I was away?")}>
            Catch me up
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">Built from your tasks, meetings, messages and projects.</span>
        </div>
      </div>
    </section>
  );
}

function Priorities({ s, today }: { s: S; today: string }) {
  const tasks = todaysPriorities(s, today).slice(0, 5);
  const setStatus = useWorkspace((x) => x.setTaskStatus);
  return (
    <Panel title="Today's priorities" icon={CheckCircle2} action={viewAll("/tasks")} bodyClassName="p-2">
      {tasks.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing open" description="All your tasks are done." className="m-2 border-0" />
      ) : (
        <ul>
          {tasks.map((t) => {
            const due = t.due ? relativeDue(t.due, today) : undefined;
            const project = s.projects.find((p) => p.id === t.projectId);
            return (
              <li key={t.id} className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-muted/60">
                <button
                  type="button"
                  className="mt-0.5 text-muted-foreground transition hover:text-success"
                  aria-label={`Mark "${t.title}" as done`}
                  onClick={() => {
                    setStatus(t.id, "done");
                    toast.success("Task completed", { description: t.title });
                  }}
                >
                  <Circle className="size-4" />
                </button>
                <Link href={`/tasks?task=${t.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <PriorityDot priority={t.priority} />
                    <span className="capitalize">{t.priority}</span>
                    {project && <span className="truncate">· {project.name}</span>}
                  </p>
                </Link>
                {due && <span className={cn("shrink-0 text-[11px] font-medium", due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "text-muted-foreground")}>{due.label}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Meetings({ s, today }: { s: S; today: string }) {
  const meetings = meetingsOn(s, today);
  const now = new Date();
  return (
    <Panel title="Today's meetings" icon={CalendarDays} action={viewAll("/calendar", "Calendar")} bodyClassName="p-2">
      {meetings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No meetings today" description="A good day for focused work." className="m-2 border-0" />
      ) : (
        <ol className="relative">
          {meetings.map((m) => {
            const past = new Date(m.end) < now;
            const live = new Date(m.start) <= now && !past;
            return (
              <li key={m.id}>
                <Link href={`/calendar/${m.id}`} className={cn("flex gap-3 rounded-lg px-2 py-2 transition hover:bg-muted/60", past && "opacity-55")}>
                  <div className="w-11 shrink-0 text-right">
                    <p className="text-xs font-semibold tabular">{formatTime(m.start)}</p>
                    <p className="text-[11px] text-muted-foreground tabular">{formatTime(m.end)}</p>
                  </div>
                  <span className={cn("w-0.5 shrink-0 rounded-full", live ? "bg-success" : "bg-primary/40")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarStack ids={m.participantIds} max={4} />
                      {live && <Pill tone="success">Now</Pill>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function Messages({ s }: { s: S }) {
  const msgs = attentionMessages(s).slice(0, 5);
  return (
    <Panel title="Needs your attention" icon={Inbox} action={viewAll("/inbox?filter=action", "Inbox")} bodyClassName="p-2">
      {msgs.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox zero" description="Nothing needs a response." className="m-2 border-0" />
      ) : (
        <ul>
          {msgs.map((m) => {
            const from = employeeById(m.fromId);
            return (
              <li key={m.id}>
                <Link href={`/inbox?m=${m.id}`} className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-muted/60">
                  <SourceIcon source={m.channel} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", !m.read && "font-semibold")}>{m.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {from?.name ?? m.fromName} · {timeAgo(m.receivedAt)}
                    </p>
                  </div>
                  {m.important && <Pill tone="warning">Important</Pill>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Projects({ s }: { s: S }) {
  const user = me(s);
  const projects = user.persona === "lead" || user.persona === "pm" ? (user.persona === "pm" ? myProjects(s) : visibleProjects(s)) : myProjects(s);
  return (
    <Panel title={user.persona === "lead" ? "Projects you can see" : "Your projects"} icon={FolderKanban} action={viewAll("/projects")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.slice(0, 6).map((p) => {
          const pct = projectProgress(s, p);
          const next = p.milestones.filter((m) => !m.done).sort((a, b) => a.due.localeCompare(b.due))[0];
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-lg border p-3 transition hover:border-primary/30 hover:shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.code} · owner {employeeById(p.ownerId)?.firstName}</p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ProgressBar value={pct} tone={p.status === "blocked" ? "danger" : p.status === "at-risk" ? "warning" : "primary"} label={`${p.name} progress`} />
                <span className="w-9 text-right text-xs font-semibold tabular">{pct}%</span>
              </div>
              {next && <p className="mt-2 truncate text-[11px] text-muted-foreground">Next: {next.title} · {formatDate(next.due, "d MMM")}</p>}
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function Hours({ s, today }: { s: S; today: string }) {
  const monday = mondayOf(today);
  const entries = entriesForWeek(s.hours, s.currentUserId, monday);
  const total = totalHours(entries);
  const data = weekDates(monday)
    .slice(0, 5)
    .map((d) => ({ day: formatDate(d, "EEE"), date: d, hours: Math.round(entries.filter((e) => e.date === d).reduce((a, e) => a + entryHours(e), 0) * 100) / 100 }));
  return (
    <Panel title="Hours this week" icon={Clock} action={viewAll("/hours", "Register")}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular">{formatHours(total)}</p>
          <p className="text-xs text-muted-foreground">of 40:00 registered</p>
        </div>
        <HoursStatusBadge status={weekStatus(entries)} />
      </div>
      <div className="mt-3 h-28" aria-label="Registered hours per day this week">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" domain={[0, 10]} ticks={[0, 4, 8]} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${formatHours(Number(v))} h`, "Registered"]} />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.date === today ? "var(--chart-1)" : "color-mix(in oklch, var(--chart-1) 45%, transparent)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function Approvals({ s }: { s: S }) {
  const user = me(s);
  const pending = pendingApprovals(s);
  const decide = useWorkspace((x) => x.decideAccess);
  const team = user.approves?.teamMemberIds ?? [];
  const timesheets = [...new Set(s.hours.filter((h) => h.status === "submitted" && team.includes(h.userId)).map((h) => h.userId))];
  const mine = s.accessRequests.filter((r) => r.requesterId === s.currentUserId).slice(0, 3);
  const name = (type: string, id: string) => (type === "project" ? s.projects.find((p) => p.id === id)?.name : documents.find((d) => d.id === id)?.title) ?? id;
  return (
    <Panel title={user.approves ? "Pending approvals" : "My requests"} icon={ShieldCheck} action={viewAll("/requests")}>
      {user.approves ? (
        <div className="space-y-3">
          {pending.length === 0 && timesheets.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for your approval.</p>}
          {pending.map((r) => (
            <div key={r.id} className="rounded-lg border p-3" data-testid="dashboard-approval">
              <div className="flex items-center gap-2">
                <PersonAvatar id={r.requesterId} size="xs" />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{employeeById(r.requesterId)?.firstName}</span> → {name(r.resourceType, r.resourceId)}
                </p>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">“{r.reason}”</p>
              <div className="mt-2 flex gap-1.5">
                <Button size="xs" onClick={() => (decide(r.id, true), toast.success("Access approved"))}>
                  Approve
                </Button>
                <Button size="xs" variant="outline" onClick={() => (decide(r.id, false), toast("Request declined"))}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
          {timesheets.length > 0 && (
            <Link href="/hours?tab=team" className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm transition hover:bg-muted/60">
              <Clock className="size-4 text-info" /> {timesheets.length} timesheet{timesheets.length === 1 ? "" : "s"} to approve
              <AvatarStack ids={timesheets} />
            </Link>
          )}
        </div>
      ) : mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no access requests.</p>
      ) : (
        <ul className="space-y-2">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{name(r.resourceType, r.resourceId)}</span>
              <Pill tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "info"}>{r.status}</Pill>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Github({ s }: { s: S }) {
  const prs = visiblePullRequests(s);
  const reviews = prs.filter((p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId));
  const mine = prs.filter((p) => p.authorId === s.currentUserId && p.state !== "merged");
  const repoName = (id: string) => repositories.find((r) => r.id === id)?.name;
  const recentIssues = s.issues.filter((i) => i.createdInDemo).slice(0, 2);
  return (
    <Panel title="GitHub activity" icon={GitBranch} action={viewAll("/github")} bodyClassName="p-2">
      <ul>
        {reviews.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <GitPullRequest className="size-4 shrink-0 text-ai" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                Review requested · {repoName(p.repoId)}#{p.number}
              </p>
            </div>
          </li>
        ))}
        {mine.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <GitPullRequest className={cn("size-4 shrink-0", p.state === "draft" ? "text-muted-foreground" : "text-success")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.state === "draft" ? "Draft" : "Open"} · checks {p.checks} · {repoName(p.repoId)}#{p.number}
              </p>
            </div>
          </li>
        ))}
        {recentIssues.map((i) => (
          <li key={i.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Circle className="size-4 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{i.title}</p>
              <p className="text-xs text-muted-foreground">
                New simulated issue · {repoName(i.repoId)}#{i.number}
              </p>
            </div>
          </li>
        ))}
        {reviews.length + mine.length + recentIssues.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">No open pull requests.</li>}
      </ul>
    </Panel>
  );
}

function ActivityFeed({ s }: { s: S }) {
  const items = myActivity(s).slice(0, 8);
  return (
    <Panel title="Activity" icon={ActivityIcon} description="From Teams, Outlook, GitHub, projects, learning and your logbook" bodyClassName="p-2">
      <ol data-testid="activity-feed">
        {items.map((a) => {
          const actor = employeeById(a.actorId);
          const inner = (
            <>
              <PersonAvatar person={actor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{a.actorId === s.currentUserId ? "You" : actor?.firstName}</span> <span className="text-foreground/80">{a.text}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <SourceLabel source={a.source} />
                  {timeAgo(a.at)}
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
    </Panel>
  );
}

function Learning({ s }: { s: S }) {
  const rec = learningRecommendations(s)[0];
  const profile = s.learning.find((l) => l.userId === s.currentUserId);
  const active = (profile?.enrolledCourseIds ?? []).map((id) => ({ id, pct: courseProgress(s, id) })).filter((c) => c.pct > 0 && c.pct < 100).slice(0, 3);
  return (
    <Panel title="Learning" icon={GraduationCap} action={viewAll("/learning")}>
      {rec && (
        <div className="ai-surface mb-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-ai" />
            <p className="text-xs font-semibold text-ai">Recommended for your work</p>
          </div>
          <p className="mt-1.5 text-sm font-medium">{rec.course.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{rec.reason}</p>
        </div>
      )}
      <ul className="space-y-2.5">
        {active.map((c) => (
          <li key={c.id}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="truncate">{learningTitle(c.id)}</span>
              <span className="tabular text-muted-foreground">{c.pct}%</span>
            </div>
            <ProgressBar value={c.pct} tone="success" label={`${learningTitle(c.id)} progress`} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const learningTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? id;

function Team({ s }: { s: S }) {
  const rows = workload(s);
  const max = Math.max(1, ...rows.map((r) => r.open));
  return (
    <Panel title="Team workload" icon={Users} description="Open tasks per team member" action={viewAll("/people")}>
      <ul className="space-y-3">
        {rows.map(({ employee, open, urgent }) => (
          <li key={employee.id} className="flex items-center gap-3">
            <PersonAvatar person={employee} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{employee.name}</span>
                <span className="text-muted-foreground tabular">
                  {open} open{urgent ? ` · ${urgent} high` : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", urgent >= 2 ? "bg-warning" : "bg-primary/70")} style={{ width: `${(open / max) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">Team leads see workload and submitted timesheets, not private messages or logbooks.</p>
    </Panel>
  );
}

export function Widget({ id, s, today }: { id: WidgetId; s: S; today: string }) {
  switch (id) {
    case "briefing":
      return <Briefing s={s} />;
    case "priorities":
      return <Priorities s={s} today={today} />;
    case "meetings":
      return <Meetings s={s} today={today} />;
    case "messages":
      return <Messages s={s} />;
    case "projects":
      return <Projects s={s} />;
    case "hours":
      return <Hours s={s} today={today} />;
    case "approvals":
      return <Approvals s={s} />;
    case "github":
      return <Github s={s} />;
    case "activity":
      return <ActivityFeed s={s} />;
    case "learning":
      return <Learning s={s} />;
    case "team":
      return <Team s={s} />;
  }
}

