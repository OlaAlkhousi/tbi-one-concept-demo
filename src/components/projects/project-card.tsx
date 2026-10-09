"use client";

import Link from "next/link";
import { Clock, Flag, ListChecks, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, PriorityBadge, ProjectStatusBadge } from "@/components/common/badges";
import { ProgressBar } from "@/components/common/layout";
import { AvatarStack, PersonAvatar } from "@/components/common/person-avatar";
import { employeeById, projectProgress, type S } from "@/lib/selectors";
import { relativeDue } from "@/lib/time";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { ProjectMonogram, accentStyle, progressTone } from "./project-visuals";

export const nextMilestone = (p: Project) => p.milestones.filter((m) => !m.done).sort((a, b) => a.due.localeCompare(b.due))[0];

export function ProjectCard({ s, project: p, today }: { s: S; project: Project; today: string }) {
  const pct = projectProgress(s, p);
  const owner = employeeById(p.ownerId);
  const next = nextMilestone(p);
  const due = next ? relativeDue(next.due, today) : undefined;
  const blockers = p.risks.filter((r) => r.isBlocker).length;
  const openTasks = s.tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
  const isMember = p.teamIds.includes(s.currentUserId);

  return (
    <Link
      href={`/projects/${p.id}`}
      data-testid="project-card"
      data-project-id={p.id}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:-translate-y-px hover:border-primary/25 hover:shadow-lift focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="h-1 w-full" style={accentStyle(p.hue)} aria-hidden />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <ProjectMonogram project={p} />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary">{p.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono">{p.code}</span>
              <span aria-hidden>·</span>
              <span className="truncate">owner {owner?.name}</span>
            </p>
          </div>
          {isMember && <Pill tone="primary">Member</Pill>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <ProjectStatusBadge status={p.status} />
          <PriorityBadge priority={p.priority} />
          {p.visibility === "restricted" && (
            <Pill tone="warning" icon={Lock}>
              Restricted
            </Pill>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <ProgressBar value={pct} tone={progressTone(p.status)} label={`${p.name} progress`} />
          <span className="w-9 text-right text-xs font-semibold tabular">{pct}%</span>
        </div>

        {next ? (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Flag className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              Next: <span className="text-foreground/90">{next.title}</span>
            </span>
            {due && <span className={cn("ml-auto shrink-0 font-medium", due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "")}>{due.label}</span>}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">All milestones done</p>
        )}

        {p.technologies.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Technologies">
            {p.technologies.slice(0, 4).map((t) => (
              <li key={t} className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {t}
              </li>
            ))}
            {p.technologies.length > 4 && <li className="px-1 py-0.5 text-[11px] text-muted-foreground">+{p.technologies.length - 4}</li>}
          </ul>
        )}

        <div className="min-h-4 flex-1" aria-hidden />
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span className="flex items-center gap-2">
            <AvatarStack ids={p.teamIds} max={5} />
            <span className="sr-only">Team: {p.teamIds.map((id) => employeeById(id)?.name).join(", ")}</span>
          </span>
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular" title="Open tasks">
              <ListChecks className="size-3.5" aria-hidden /> {openTasks}
              <span className="sr-only">open tasks</span>
            </span>
            <span className={cn("inline-flex items-center gap-1 tabular", blockers ? "text-danger" : p.risks.length ? "text-warning" : "")} title="Open risks">
              <TriangleAlert className="size-3.5" aria-hidden /> {p.risks.length}
              <span className="sr-only">open risks</span>
              {blockers > 0 && <span>· {blockers} blocker{blockers === 1 ? "" : "s"}</span>}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** A restricted project the user can't open: only name, code, owner and the fact that it is restricted. */
export function LockedProjectCard({ s, project: p }: { s: S; project: Project }) {
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const owner = employeeById(p.ownerId);
  const pending = s.accessRequests.some((r) => r.requesterId === s.currentUserId && r.resourceId === p.id && r.status === "pending");
  return (
    <article data-testid="project-card" data-project-id={p.id} data-locked="true" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-dashed bg-card/60 shadow-card">
      <span className="h-1 w-full bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,transparent_6px_12px)]" aria-hidden />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
            <Lock className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm leading-snug font-semibold">{p.name}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.code}</p>
          </div>
          <Pill tone="warning" icon={Lock}>
            Restricted
          </Pill>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <PersonAvatar person={owner} size="xs" /> Owner <span className="font-medium text-foreground">{owner?.name}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Details are only visible to project members and people with approved access.</p>
        <div className="mt-auto pt-4">
          {pending ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 text-xs font-medium text-info">
              <Clock className="size-3.5" aria-hidden /> Request pending
            </p>
          ) : (
            <Button size="sm" variant="outline" onClick={() => openAccessDialog("project", p.id)} aria-label={`Request access to ${p.name}`}>
              <ShieldCheck /> Request access
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
