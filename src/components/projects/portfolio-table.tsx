"use client";

import Link from "next/link";
import { Clock, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pill, ProjectStatusBadge } from "@/components/common/badges";
import { ProgressBar } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { canViewProject } from "@/lib/permissions";
import { employeeById, projectProgress, type S } from "@/lib/selectors";
import { addDaysISO, daysBetween, formatDate } from "@/lib/time";
import type { ISODate, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { nextMilestone } from "./project-card";
import { ProjectMonogram, progressTone } from "./project-visuals";

/** First day of every month that falls inside [from, to]. */
function monthStarts(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let [y, m] = from.split("-").map(Number);
  for (;;) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const d = `${y}-${String(m).padStart(2, "0")}-01`;
    if (d > to) return out;
    out.push(d);
  }
}

/**
 * Compact portfolio view for project managers and team leads: one row per project
 * with a CSS timeline (start–end bar, progress fill, milestones and a today marker).
 */
export function PortfolioTable({ s, projects, today }: { s: S; projects: Project[]; today: string }) {
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const readable = projects.filter((p) => canViewProject(s, s.currentUserId, p));
  // Pad the range by a week on both sides so bars never touch the edges.
  const from = addDaysISO([today, ...readable.map((p) => p.start)].sort()[0], -7);
  const to = addDaysISO([today, ...readable.map((p) => p.end)].sort().at(-1)!, 7);
  const span = Math.max(1, daysBetween(from, to));
  const pos = (d: ISODate) => `${(daysBetween(from, d) / span) * 100}%`;
  const months = monthStarts(from, to);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card" data-testid="portfolio-table">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="w-[130px]">Progress</TableHead>
            <TableHead className="w-[320px]">
              <span className="sr-only">Timeline</span>
              <div className="relative h-5 min-w-[280px]" aria-hidden>
                {months.map((m) => (
                  <span key={m} className="absolute top-0.5 -translate-x-1/2 text-[10px] font-normal text-muted-foreground" style={{ left: pos(m) }}>
                    {formatDate(m, "MMM")}
                  </span>
                ))}
              </div>
            </TableHead>
            <TableHead>Next milestone</TableHead>
            <TableHead className="pr-4 text-right">Risks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => {
            const owner = employeeById(p.ownerId);
            if (!canViewProject(s, s.currentUserId, p)) {
              const pending = s.accessRequests.some((r) => r.requesterId === s.currentUserId && r.resourceId === p.id && r.status === "pending");
              return (
                <TableRow key={p.id} data-locked="true" className="bg-muted/20">
                  <TableCell className="min-w-[190px] max-w-[230px] pl-4 whitespace-normal">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
                        <Lock className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="leading-snug font-medium">{p.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{p.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Pill tone="warning" icon={Lock}>
                      Restricted
                    </Pill>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <PersonAvatar person={owner} size="xs" /> {owner?.firstName}
                    </span>
                  </TableCell>
                  <TableCell colSpan={4} className="pr-4 text-xs text-muted-foreground">
                    <span className="flex items-center justify-between gap-3">
                      Details are hidden until you have access.
                      {pending ? (
                        <span className="inline-flex items-center gap-1 text-info">
                          <Clock className="size-3.5" aria-hidden /> Request pending
                        </span>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => openAccessDialog("project", p.id)} aria-label={`Request access to ${p.name}`}>
                          <ShieldCheck /> Request access
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            }
            const pct = projectProgress(s, p);
            const next = nextMilestone(p);
            const blockers = p.risks.filter((r) => r.isBlocker).length;
            const done = p.milestones.filter((m) => m.done).length;
            const tone = progressTone(p.status);
            return (
              <TableRow key={p.id}>
                <TableCell className="min-w-[190px] max-w-[230px] pl-4 whitespace-normal">
                  <Link href={`/projects/${p.id}`} className="group flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                    <ProjectMonogram project={p} className="size-7 rounded-md text-[9px]" />
                    <span className="min-w-0">
                      <span className="block leading-snug font-medium group-hover:text-primary">{p.name}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{p.code}</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <PersonAvatar person={owner} size="xs" /> {owner?.firstName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <ProgressBar value={pct} tone={tone} label={`${p.name} progress`} />
                    <span className="w-8 text-right text-xs font-semibold tabular">{pct}%</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="sr-only">
                    Runs from {formatDate(p.start, "d MMM")} to {formatDate(p.end, "d MMM yyyy")}; {done} of {p.milestones.length} milestones done.
                  </span>
                  <div className="relative h-6 min-w-[280px]" aria-hidden>
                    <span className="absolute inset-y-0 w-px bg-primary/50" style={{ left: pos(today) }} title={`Today, ${formatDate(today, "d MMM")}`} />
                    <span
                      className="absolute top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
                      style={{ left: pos(p.start), width: `${(daysBetween(p.start, p.end) / span) * 100}%` }}
                      title={`${formatDate(p.start, "d MMM")} – ${formatDate(p.end, "d MMM yyyy")}`}
                    >
                      <span
                        className={cn("block h-full rounded-full", tone === "danger" ? "bg-danger/70" : tone === "warning" ? "bg-warning/70" : tone === "success" ? "bg-success/70" : "bg-primary/60")}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    {p.milestones.map((m) => (
                      <span
                        key={m.id}
                        className={cn("absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-2 ring-card", m.done ? "bg-foreground/70" : "border border-foreground/60 bg-card")}
                        style={{ left: pos(m.due) }}
                        title={`${m.title} · ${formatDate(m.due, "d MMM")}${m.done ? " (done)" : ""}`}
                      />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px]">
                  {next ? (
                    <span className="block min-w-0">
                      <span className="block truncate text-xs">{next.title}</span>
                      <span className={cn("block text-[11px]", next.due < today ? "text-danger" : "text-muted-foreground")}>{formatDate(next.due, "EEE d MMM")}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">All done</span>
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <span className={cn("inline-flex items-center gap-1 text-xs tabular", blockers ? "text-danger" : p.risks.length ? "text-warning" : "text-muted-foreground")}>
                    <TriangleAlert className="size-3.5" aria-hidden />
                    {p.risks.length}
                    {blockers > 0 && <span className="text-[11px]">({blockers} blocker)</span>}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-full bg-primary/60" aria-hidden /> Progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-foreground/70" aria-hidden /> Milestone done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rotate-45 border border-foreground/60" aria-hidden /> Milestone open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-primary/50" aria-hidden /> Today
        </span>
      </p>
    </div>
  );
}
