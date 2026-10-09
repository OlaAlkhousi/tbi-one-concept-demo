"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock, FileText, FolderKanban, Lock, MapPin, MicOff, NotebookText, Sparkles, Users, Video, Wand2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canViewProjectId } from "@/lib/permissions";
import { employeeById, myOpenTasks, projectById, visibleMeetings, type S } from "@/lib/selectors";
import { dateOf, formatDate, formatTime, relativeDue } from "@/lib/time";
import type { Employee, ISODate, Meeting } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { AiBadge, Panel } from "@/components/common/layout";
import { Pill, PriorityDot, ProjectStatusBadge } from "@/components/common/badges";
import { PersonAvatar, availabilityLabel } from "@/components/common/person-avatar";
import { durationLabel, hueSwatch, prettifyDates, relativeDay } from "./utils";

// ─── AI summary ──────────────────────────────────────────────────────────────

export function SummaryCard({ meeting, canPlan, planOpen, onGenerate }: { meeting: Meeting; canPlan: boolean; planOpen: boolean; onGenerate: () => void }) {
  const points = meeting.actionPoints ?? [];
  const converted = Boolean(meeting.actionPlanCreatedAt);
  return (
    <section className="ai-surface overflow-hidden rounded-xl border shadow-card" aria-labelledby="summary-title" data-testid="meeting-summary">
      <div className="flex items-start justify-between gap-3 border-b border-ai/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="summary-title" className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="size-4 text-ai" aria-hidden /> AI meeting summary
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Summary from meeting transcription (simulated)</p>
        </div>
        <AiBadge className="shrink-0" />
      </div>

      <div className="space-y-5 p-4">
        {meeting.summary && <p className="text-sm leading-relaxed text-foreground/90">{prettifyDates(meeting.summary)}</p>}

        {(Boolean(meeting.keyPoints?.length) || Boolean(meeting.decisions?.length)) && (
          <div className="grid gap-5 sm:grid-cols-2">
            {Boolean(meeting.keyPoints?.length) && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Key points</h3>
                <ul className="space-y-1.5">
                  {meeting.keyPoints!.map((k) => (
                    <li key={k} className="flex gap-2 text-sm leading-snug">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ai" aria-hidden />
                      {prettifyDates(k)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Boolean(meeting.decisions?.length) && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Decisions</h3>
                <ul className="space-y-1.5">
                  {meeting.decisions!.map((d) => (
                    <li key={d} className="flex gap-2 text-sm leading-snug">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            Action points
            {points.length > 0 && <span className="tabular">({points.length})</span>}
            {converted && (
              <Pill tone="success" icon={CheckCircle2}>
                Turned into tasks
              </Pill>
            )}
          </h3>
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action points were captured in this meeting.</p>
          ) : (
            <ol className="space-y-2" data-testid="action-points">
              {points.map((ap, i) => {
                const by = employeeById(ap.mentionedBy);
                return (
                  <li key={ap.id} className="flex gap-3 rounded-lg border bg-card/70 px-3 py-2.5">
                    <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ai-soft text-[11px] font-semibold text-ai tabular">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{ap.text}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <PersonAvatar person={by} size="xs" />
                        Raised by {by?.name ?? "someone"} · <span className="tabular">{ap.timestamp}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {points.length > 0 && !converted && !planOpen && (
        <div className="flex flex-col gap-3 border-t border-ai/10 bg-card/50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-muted-foreground">
            {canPlan
              ? `Turn ${points.length === 1 ? "this action point" : `these ${points.length} action points`} into tasks with suggested owners, priorities and deadlines. You review everything first.`
              : "Only participants of this meeting can turn its action points into tasks."}
          </p>
          {canPlan && (
            <Button onClick={onGenerate} data-testid="generate-plan" className="shrink-0 self-start bg-gradient-to-r from-primary to-[oklch(0.52_0.2_292)] text-primary-foreground sm:self-auto">
              <Sparkles /> Generate Action Plan
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** A meeting that has ended but has no (simulated) transcription summary. */
export function NoSummary() {
  return (
    <Panel title="Meeting summary" icon={MicOff}>
      <p className="text-sm text-muted-foreground">No summary for this meeting: transcription was not switched on (simulated). Notes and agenda are below.</p>
    </Panel>
  );
}

// ─── Preparation ─────────────────────────────────────────────────────────────

export function PrepareCard({ meeting, s, today }: { meeting: Meeting; s: S; today: ISODate }) {
  const ask = useWorkspace((x) => x.askAssistant);
  const project = projectById(s, meeting.projectId);
  const tasks = project ? myOpenTasks(s).filter((t) => t.projectId === project.id) : [];
  const previous = meeting.projectId
    ? visibleMeetings(s)
        .filter((m) => m.id !== meeting.id && m.projectId === meeting.projectId && m.start < meeting.start && m.decisions?.length)
        .sort((a, b) => b.start.localeCompare(a.start))[0]
    : undefined;
  const when = relativeDay(dateOf(meeting.start), today);

  return (
    <Panel
      title="Prepare for this meeting"
      icon={CalendarClock}
      description={`${when ?? formatDate(meeting.start, "EEEE d MMMM")} at ${formatTime(meeting.start)} · built from the agenda, your tasks and earlier meetings`}
      bodyClassName="space-y-5"
    >
      <div>
        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Agenda</h3>
        {meeting.agenda.length ? (
          <ol className="space-y-1.5">
            {meeting.agenda.map((a, i) => (
              <li key={a} className="flex gap-2.5 text-sm">
                <span className="w-4 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No agenda shared yet. Ask the organiser, {employeeById(meeting.organizerId)?.firstName}, what to bring.</p>
        )}
      </div>

      {project && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Your open tasks for {project.name}</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no open tasks for this project.</p>
          ) : (
            <ul className="-mx-2">
              {tasks.slice(0, 5).map((t) => {
                const due = t.due ? relativeDue(t.due, today) : undefined;
                return (
                  <li key={t.id}>
                    <Link href={`/tasks?task=${t.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-muted/60">
                      <PriorityDot priority={t.priority} />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      {due && <span className={cn("shrink-0 text-[11px] font-medium", due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "text-muted-foreground")}>{due.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {previous && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
            Decided in{" "}
            <Link href={`/calendar/${previous.id}`} className="text-foreground underline-offset-4 hover:underline">
              {previous.title}
            </Link>{" "}
            · {formatDate(previous.start, "EEE d MMM")}
          </h3>
          <ul className="space-y-1.5">
            {previous.decisions!.map((d) => (
              <li key={d} className="flex gap-2 text-sm leading-snug">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
          {Boolean(previous.actionPoints?.length) && !previous.actionPlanCreatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Its action points aren&apos;t tasks yet.{" "}
              <Link href={`/calendar/${previous.id}?plan=1`} className="font-medium text-ai underline-offset-4 hover:underline">
                Generate the action plan
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="ai-surface flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs text-muted-foreground">Want a short prep plan? The assistant uses your tasks, this agenda and earlier decisions.</p>
        <Button size="sm" variant="outline" className="shrink-0 self-start bg-card/70 sm:self-auto" onClick={() => ask("How should I prepare for my next meeting?")} data-testid="prepare-ask">
          <Sparkles className="text-ai" /> Ask AI how to prepare
        </Button>
      </div>
    </Panel>
  );
}

// ─── About: description, agenda, notes ───────────────────────────────────────

export function AboutPanel({ meeting, showAgenda }: { meeting: Meeting; showAgenda: boolean }) {
  const hasAgenda = showAgenda && meeting.agenda.length > 0;
  if (!meeting.description && !hasAgenda && !meeting.notes) return null;
  return (
    <Panel title="About this meeting" icon={FileText} bodyClassName="space-y-5">
      {meeting.description && <p className="text-sm leading-relaxed">{meeting.description}</p>}
      {hasAgenda && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Agenda</h3>
          <ol className="space-y-1.5">
            {meeting.agenda.map((a, i) => (
              <li key={a} className="flex gap-2.5 text-sm">
                <span className="w-4 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ol>
        </div>
      )}
      {meeting.notes && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <NotebookText className="size-3.5" aria-hidden /> Notes
          </h3>
          <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed">{meeting.notes}</p>
        </div>
      )}
    </Panel>
  );
}

// ─── Side panels ─────────────────────────────────────────────────────────────

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="mt-0.5 shrink-0">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  );
}

export function DetailsPanel({ meeting, s, today }: { meeting: Meeting; s: S; today: ISODate }) {
  const project = projectById(s, meeting.projectId);
  const canSeeProject = canViewProjectId(s, s.currentUserId, meeting.projectId);
  const organizer = employeeById(meeting.organizerId);
  const rel = relativeDay(dateOf(meeting.start), today);
  const online = /teams/i.test(meeting.location);
  return (
    <Panel title="Details" bodyClassName="p-4">
      <dl className="space-y-3.5">
        <Row icon={Clock} label="When">
          <p className="font-medium">
            {rel ? `${rel}, ` : ""}
            {formatDate(meeting.start, rel ? "d MMMM" : "EEEE d MMMM yyyy")}
          </p>
          <p className="text-xs text-muted-foreground tabular">
            {formatTime(meeting.start)}–{formatTime(meeting.end)} · {durationLabel(meeting)} · Amsterdam time
          </p>
        </Row>
        <Row icon={online ? Video : MapPin} label="Where">
          <p>{meeting.location}</p>
        </Row>
        {meeting.projectId && (
          <Row icon={FolderKanban} label="Project">
            {project && canSeeProject ? (
              <Link href={`/projects/${project.id}`} className="group flex flex-wrap items-center gap-2">
                <span className="size-2 rounded-full" style={hueSwatch(project.hue)} aria-hidden />
                <span className="font-medium underline-offset-4 group-hover:underline">{project.name}</span>
                <ProjectStatusBadge status={project.status} />
              </Link>
            ) : (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="size-3.5" aria-hidden /> Restricted project
              </p>
            )}
          </Row>
        )}
        <Row icon={CalendarClock} label="Organiser">
          <p className="flex items-center gap-2">
            <PersonAvatar person={organizer} size="xs" />
            <span>
              {organizer?.name}
              {organizer?.id === s.currentUserId && <span className="text-muted-foreground"> (you)</span>}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Organiser · from the Outlook calendar (simulated)</p>
        </Row>
      </dl>
    </Panel>
  );
}

export function ParticipantsPanel({ meeting, s }: { meeting: Meeting; s: S }) {
  const people = meeting.participantIds.map((id) => employeeById(id)).filter((p): p is Employee => p !== undefined);
  return (
    <Panel title="Participants" icon={Users} action={<span className="text-xs text-muted-foreground tabular">{people.length}</span>} bodyClassName="p-2">
      <ul data-testid="participants">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <PersonAvatar person={p} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {p.name}
                {p.id === s.currentUserId && <span className="font-normal text-muted-foreground"> (you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {p.role} · {availabilityLabel[p.availability]}
              </p>
            </div>
            {p.id === meeting.organizerId && <Pill>Organiser</Pill>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
