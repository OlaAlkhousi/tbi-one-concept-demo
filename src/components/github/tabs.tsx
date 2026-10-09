"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity as ActivityIcon, CircleDot, Eye, GitCommitHorizontal, GitPullRequest, Search, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Panel } from "@/components/common/layout";
import { SourceLabel } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { canViewProjectId } from "@/lib/permissions";
import { employeeById, me, visibleIssues, visiblePullRequests, visibleRepos, type S } from "@/lib/selectors";
import { dateOf, formatDate, timeAgo } from "@/lib/time";
import type { Commit, GithubIssue, PullRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/projects/segmented";
import { CommitRow, IssueRow, PrRow, RepoCard } from "./rows";

const ALL = "all";

export type SetParams = (patch: Record<string, string | null>) => void;
/** Builds the link that opens an issue in the sheet while keeping the current tab and filters. */
export type IssueHref = (issueId: string) => string;

export function commitsFor(s: S): Commit[] {
  const repos = new Set(visibleRepos(s).map((r) => r.id));
  return s.commits.filter((c) => repos.has(c.repoId)).sort((a, b) => b.at.localeCompare(a.at));
}

function ListPanel({ title, icon, empty, action, children, count, className }: { title: string; icon: typeof CircleDot; empty: string; action?: React.ReactNode; children: React.ReactNode[]; count?: number; className?: string }) {
  return (
    <Panel
      title={
        <>
          {title}
          {count !== undefined && <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular">{count}</span>}
        </>
      }
      icon={icon}
      action={action}
      bodyClassName="p-0"
      className={className}
    >
      {children.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p> : <ul className="divide-y">{children}</ul>}
    </Panel>
  );
}

const tabLink = (href: string, label: string) => (
  <Link href={href} scroll={false} className="text-xs font-medium text-muted-foreground transition hover:text-foreground">
    {label}
  </Link>
);

// ─── Overview ──────────────────────────────────────────────────────────────

export function OverviewTab({ s, issueHref }: { s: S; issueHref: IssueHref }) {
  const user = me(s);
  const prs = visiblePullRequests(s);
  const issues = visibleIssues(s);
  const reviewRequests = prs.filter((p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId));
  const myPrs = prs.filter((p) => p.authorId === s.currentUserId && p.state !== "merged");
  const assigned = issues.filter((i) => i.assigneeId === s.currentUserId && i.state === "open");
  const commits = commitsFor(s).slice(0, 6);
  const teamPrs = prs.filter((p) => p.state !== "merged").sort((a, b) => (a.checks === "failing" ? -1 : 0) - (b.checks === "failing" ? -1 : 0) || b.createdAt.localeCompare(a.createdAt));
  const activity = s.activity
    .filter((a) => a.source === "github" && (a.visibleTo ? a.visibleTo.includes(s.currentUserId) : canViewProjectId(s, s.currentUserId, a.projectId)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const panels = {
    reviews: (
      <ListPanel key="reviews" title="Review requests" icon={Eye} count={reviewRequests.length} empty="No pull requests are waiting for your review." action={tabLink("/github?tab=pulls&filter=review", "All reviews")}>
        {reviewRequests.map((p) => (
          <PrRow key={p.id} s={s} pr={p} />
        ))}
      </ListPanel>
    ),
    myPrs: (
      <ListPanel key="myPrs" title="Your pull requests" icon={GitPullRequest} count={myPrs.length} empty="You have no open pull requests." action={tabLink("/github?tab=pulls&filter=mine", "View all")}>
        {myPrs.map((p) => (
          <PrRow key={p.id} s={s} pr={p} />
        ))}
      </ListPanel>
    ),
    assigned: (
      <ListPanel key="assigned" title="Assigned to you" icon={CircleDot} count={assigned.length} empty="No open issues are assigned to you." action={tabLink("/github?tab=issues&assignee=me", "View all")}>
        {assigned.map((i) => (
          <IssueRow key={i.id} s={s} issue={i} href={issueHref(i.id)} />
        ))}
      </ListPanel>
    ),
    team: (
      <ListPanel key="team" title="Team pull requests" icon={Users} count={teamPrs.length} empty="No open pull requests in your team's repositories." action={tabLink("/github?tab=pulls", "View all")} className="lg:col-span-2">
        {teamPrs.map((p) => (
          <PrRow key={p.id} s={s} pr={p} />
        ))}
      </ListPanel>
    ),
    commits: (
      <ListPanel key="commits" title="Recent commits" icon={GitCommitHorizontal} empty="No recent commits." action={tabLink("/github?tab=commits", "All commits")}>
        {commits.map((c) => (
          <CommitRow key={c.sha} commit={c} />
        ))}
      </ListPanel>
    ),
    activity: (
      <ListPanel key="activity" title="Recent activity" icon={ActivityIcon} empty="No recent GitHub activity.">
        {activity.map((a) => {
          const actor = employeeById(a.actorId);
          return (
            <li key={a.id} className="flex gap-2.5 px-4 py-2.5">
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
            </li>
          );
        })}
      </ListPanel>
    ),
  };

  // Each persona sees what they act on first.
  const order: (keyof typeof panels)[] =
    user.persona === "developer"
      ? ["reviews", "myPrs", "assigned", "commits", "activity"]
      : user.persona === "intern"
        ? ["assigned", "myPrs", "reviews", "commits", "activity"]
        : ["team", "assigned", "commits", "activity"];

  return <div className="grid items-start gap-4 lg:grid-cols-2">{order.map((k) => panels[k])}</div>;
}

// ─── Issues ────────────────────────────────────────────────────────────────

export function IssuesTab({ s, params, setParams, issueHref }: { s: S; params: URLSearchParams; setParams: SetParams; issueHref: IssueHref }) {
  const [query, setQuery] = useState("");
  const state = params.get("state") === "closed" ? "closed" : "open";
  const repo = params.get("repo") ?? ALL;
  const label = params.get("label") ?? ALL;
  const mine = params.get("assignee") === "me";
  const repos = visibleRepos(s);
  const all = visibleIssues(s);
  const labels = [...new Set(all.flatMap((i) => i.labels))].sort();

  const q = query.trim().toLowerCase();
  const filtered = all
    .filter((i) => repo === ALL || i.repoId === repo)
    .filter((i) => label === ALL || i.labels.includes(label))
    .filter((i) => !mine || i.assigneeId === s.currentUserId)
    .filter((i) => !q || `${i.title} ${i.body} #${i.number} ${i.labels.join(" ")}`.toLowerCase().includes(q));
  const counts = { open: filtered.filter((i) => i.state === "open").length, closed: filtered.filter((i) => i.state === "closed").length };
  const shown = filtered.filter((i) => i.state === state).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtersActive = repo !== ALL || label !== ALL || mine || q;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Segmented
          label="Issue state"
          value={state}
          onChange={(v) => setParams({ state: v === "open" ? null : v })}
          options={[
            { value: "open", label: <>Open <span className="tabular">{counts.open}</span></> },
            { value: "closed", label: <>Closed <span className="tabular">{counts.closed}</span></> },
          ]}
        />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issues" aria-label="Search issues" className="pl-8" type="search" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={repo} onValueChange={(v) => setParams({ repo: v === ALL ? null : v })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by repository">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All repositories</SelectItem>
              {repos.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={label} onValueChange={(v) => setParams({ label: v === ALL ? null : v })}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All labels</SelectItem>
              {labels.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" aria-pressed={mine} onClick={() => setParams({ assignee: mine ? null : "me" })} className={cn("col-span-2 sm:col-span-1", mine && "border-primary/40 bg-accent text-accent-foreground")}>
            <UserRound /> Assigned to me
          </Button>
        </div>
      </div>

      <Panel bodyClassName="p-0">
        {shown.length === 0 ? (
          <EmptyState
            icon={CircleDot}
            title={`No ${state} issues`}
            description={filtersActive ? "Nothing matches these filters." : state === "open" ? "Everything is closed. Nice." : "No issues have been closed yet."}
            className="m-4 border-0"
            action={
              filtersActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setParams({ repo: null, label: null, assignee: null });
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y" aria-label={`${state} issues`}>
            {shown.map((i: GithubIssue) => (
              <IssueRow key={i.id} s={s} issue={i} href={issueHref(i.id)} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ─── Pull requests ─────────────────────────────────────────────────────────

const PR_FILTERS = ["open", "review", "mine", "failing", "merged", "all"] as const;
type PrFilter = (typeof PR_FILTERS)[number];

export function PullsTab({ s, params, setParams }: { s: S; params: URLSearchParams; setParams: SetParams }) {
  const raw = params.get("filter");
  const filter: PrFilter = PR_FILTERS.includes(raw as PrFilter) ? (raw as PrFilter) : "open";
  const prs = visiblePullRequests(s);
  const match: Record<PrFilter, (p: PullRequest) => boolean> = {
    open: (p) => p.state !== "merged",
    review: (p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId),
    mine: (p) => p.authorId === s.currentUserId && p.state !== "merged",
    failing: (p) => p.state !== "merged" && p.checks === "failing",
    merged: (p) => p.state === "merged",
    all: () => true,
  };
  const labels: Record<PrFilter, string> = { open: "Open", review: "Needs my review", mine: "Mine", failing: "Failing checks", merged: "Merged", all: "All" };
  const shown = prs.filter(match[filter]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-3">
      <Segmented
        label="Pull request filter"
        value={filter}
        onChange={(v) => setParams({ filter: v === "open" ? null : v })}
        options={PR_FILTERS.map((f) => ({
          value: f,
          label: (
            <>
              {labels[f]} <span className="tabular opacity-70">{prs.filter(match[f]).length}</span>
            </>
          ),
        }))}
      />
      <Panel bodyClassName="p-0">
        {shown.length === 0 ? (
          <EmptyState icon={GitPullRequest} title="No pull requests" description="Nothing matches this filter." className="m-4 border-0" />
        ) : (
          <ul className="divide-y">
            {shown.map((p) => (
              <PrRow key={p.id} s={s} pr={p} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ─── Repositories ──────────────────────────────────────────────────────────

export function ReposTab({ s }: { s: S }) {
  const repos = visibleRepos(s);
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {repos.map((r) => (
          <RepoCard key={r.id} s={s} repo={r} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Repositories of restricted projects are only listed for project members and people with approved access.</p>
    </div>
  );
}

// ─── Commits ───────────────────────────────────────────────────────────────

export function CommitsTab({ s, params, setParams }: { s: S; params: URLSearchParams; setParams: SetParams }) {
  const repo = params.get("repo") ?? ALL;
  const repos = visibleRepos(s);
  const commits = commitsFor(s).filter((c) => repo === ALL || c.repoId === repo);
  const days = [...new Set(commits.map((c) => dateOf(c.at)))];
  return (
    <div className="space-y-3">
      <Select value={repo} onValueChange={(v) => setParams({ repo: v === ALL ? null : v })}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Filter commits by repository">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All repositories</SelectItem>
          {repos.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {commits.length === 0 ? (
        <EmptyState icon={GitCommitHorizontal} title="No commits" description="No commits in this repository yet." />
      ) : (
        days.map((d) => (
          <section key={d} aria-label={`Commits on ${formatDate(d, "EEEE d MMMM")}`}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <GitCommitHorizontal className="size-4" aria-hidden /> Commits on {formatDate(d, "EEEE d MMMM")}
            </h3>
            <Panel bodyClassName="p-0">
              <ul className="divide-y">
                {commits
                  .filter((c) => dateOf(c.at) === d)
                  .map((c) => (
                    <CommitRow key={c.sha} commit={c} />
                  ))}
              </ul>
            </Panel>
          </section>
        ))
      )}
    </div>
  );
}
