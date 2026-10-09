"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDot, Clock, FileLock, FileText, FolderGit2, GitCommitHorizontal, GitPullRequest, Gavel, Plus, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/common/badges";
import { EmptyState, Panel } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { CommitRow, IssueRow, PrRow, RepoCard } from "@/components/github/rows";
import { SimulatedBanner } from "@/components/github/shared";
import { documents } from "@/lib/data/catalog";
import { canViewDocument, canViewMeeting } from "@/lib/permissions";
import { employeeById, visibleIssues, visiblePullRequests, visibleRepos, type S } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { Decision, Project } from "@/lib/types";
import { useUi } from "@/store/ui";

// ─── Documents ─────────────────────────────────────────────────────────────

export function DocumentsTab({ s, project: p }: { s: S; project: Project }) {
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const docs = documents.filter((d) => d.projectIds.includes(p.id));
  if (docs.length === 0) return <EmptyState icon={FileText} title="No documents linked" description="Documents linked to this project in the knowledge base appear here." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {docs.map((d) => {
        if (!canViewDocument(s, s.currentUserId, d)) {
          const pending = s.accessRequests.some((r) => r.requesterId === s.currentUserId && r.resourceId === d.id && r.status === "pending");
          return (
            <article key={d.id} className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 p-4" data-testid="project-document" data-locked="true">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                <FileLock className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">Restricted document</p>
              </div>
              {pending ? (
                <Pill tone="info" icon={Clock}>
                  Pending
                </Pill>
              ) : (
                <Button size="xs" variant="outline" onClick={() => openAccessDialog("document", d.id)} aria-label={`Request access to ${d.title}`}>
                  <ShieldCheck /> Request
                </Button>
              )}
            </article>
          );
        }
        const owner = employeeById(d.ownerId);
        return (
          <Link key={d.id} href={`/knowledge?doc=${d.id}`} className="group flex flex-col rounded-xl border bg-card p-4 shadow-card transition hover:border-primary/25 hover:shadow-lift" data-testid="project-document">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium group-hover:text-primary">{d.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Pill>{d.category}</Pill>
                  {d.visibility === "restricted" && <Pill tone="warning">Restricted</Pill>}
                </div>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PersonAvatar person={owner} size="xs" /> {owner?.name} · updated {formatDate(d.updatedAt, "d MMM yyyy")}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Decisions ─────────────────────────────────────────────────────────────

export function DecisionsTab({ s, project: p }: { s: S; project: Project }) {
  const open = p.decisions.filter((d) => d.status === "open");
  const decided = p.decisions.filter((d) => d.status === "decided").sort((a, b) => b.date.localeCompare(a.date));
  if (p.decisions.length === 0) return <EmptyState icon={Scale} title="No decisions recorded" description="Decisions taken in project meetings are recorded here with their rationale." />;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title="Open decisions" icon={Scale} description="Waiting for a decision" bodyClassName="space-y-2.5">
        {open.length === 0 ? <p className="text-sm text-muted-foreground">No open decisions.</p> : open.map((d) => <DecisionCard key={d.id} s={s} project={p} decision={d} />)}
      </Panel>
      <Panel title="Decided" icon={Gavel} description="Most recent first" bodyClassName="space-y-2.5">
        {decided.length === 0 ? <p className="text-sm text-muted-foreground">No decisions taken yet.</p> : decided.map((d) => <DecisionCard key={d.id} s={s} project={p} decision={d} />)}
      </Panel>
    </div>
  );
}

function DecisionCard({ s, project: p, decision: d }: { s: S; project: Project; decision: Decision }) {
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const meeting = d.meetingId ? s.meetings.find((m) => m.id === d.meetingId) : undefined;
  return (
    <article className="rounded-lg border p-3" data-testid="project-decision">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pill tone={d.status === "open" ? "warning" : "success"}>{d.status === "open" ? "Open" : "Decided"}</Pill>
        <span className="text-xs text-muted-foreground tabular">{formatDate(d.date, "d MMM yyyy")}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{d.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/80">Rationale:</span> {d.rationale}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {meeting && canViewMeeting(s, s.currentUserId, meeting) && (
          <Link href={`/calendar/${meeting.id}`} className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{meeting.title}</span>
          </Link>
        )}
        {d.status === "open" && (
          <Button
            size="xs"
            variant="outline"
            className="ml-auto"
            onClick={() => openTaskDialog({ initial: { title: `Decide: ${d.title}`, description: `${d.rationale}\n\nPrepare options and get a decision from the owner.`, projectId: p.id, priority: "high" } })}
          >
            <Plus /> Follow-up task
          </Button>
        )}
      </div>
    </article>
  );
}

// ─── GitHub ────────────────────────────────────────────────────────────────

export function GithubTab({ s, project: p }: { s: S; project: Project }) {
  const repos = visibleRepos(s).filter((r) => p.repoIds.includes(r.id));
  const repoIds = new Set(repos.map((r) => r.id));
  const issues = visibleIssues(s).filter((i) => repoIds.has(i.repoId) && i.state === "open").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const prs = visiblePullRequests(s)
    .filter((pr) => repoIds.has(pr.repoId))
    .sort((a, b) => Number(a.state === "merged") - Number(b.state === "merged") || b.createdAt.localeCompare(a.createdAt));
  const commits = s.commits
    .filter((c) => repoIds.has(c.repoId))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const viewAll = (
    <Link href="/github" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground">
      GitHub workspace <ArrowRight className="size-3" aria-hidden />
    </Link>
  );

  if (repos.length === 0) {
    return (
      <div className="space-y-4">
        <SimulatedBanner compact />
        <EmptyState icon={FolderGit2} title="No repositories linked" description="This project has no linked repository yet." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SimulatedBanner compact />
      <div className="grid gap-4 sm:grid-cols-2">
        {repos.map((r) => (
          <RepoCard key={r.id} s={s} repo={r} />
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title={`Open issues (${issues.length})`} icon={CircleDot} action={viewAll} bodyClassName="p-0">
          {issues.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No open issues.</p>
          ) : (
            <ul className="divide-y">
              {issues.map((i) => (
                <IssueRow key={i.id} s={s} issue={i} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Pull requests (${prs.filter((pr) => pr.state !== "merged").length} open)`} icon={GitPullRequest} bodyClassName="p-0">
          {prs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pull requests.</p>
          ) : (
            <ul className="divide-y">
              {prs.map((pr) => (
                <PrRow key={pr.id} s={s} pr={pr} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Recent commits" icon={GitCommitHorizontal} bodyClassName="p-0">
        {commits.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No commits yet.</p>
        ) : (
          <ul className="divide-y">
            {commits.map((c) => (
              <CommitRow key={c.sha} commit={c} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
