"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, CircleDot, Eye, FolderGit2, FolderKanban, GitBranch, GitPullRequest, Lock, SquareCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/common/badges";
import { AvatarStack, PersonAvatar } from "@/components/common/person-avatar";
import { canViewMeeting, canViewProjectId } from "@/lib/permissions";
import { employeeById, type S } from "@/lib/selectors";
import { timeAgo } from "@/lib/time";
import type { Commit, GithubIssue, PullRequest, Repository } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { ChecksBadge, DemoIssueBadge, IssueStateIcon, LabelPill, LanguageDot, PrStateIcon, repoName } from "./shared";

/** One issue in a list. Title opens the detail sheet on /github; `href` lets /github keep its current filters. */
export function IssueRow({ s, issue, href = `/github?issue=${issue.id}` }: { s: S; issue: GithubIssue; href?: string }) {
  const setIssueState = useWorkspace((x) => x.setIssueState);
  const author = employeeById(issue.authorId);
  const assignee = employeeById(issue.assigneeId);
  const task = issue.taskId ? s.tasks.find((t) => t.id === issue.taskId) : undefined;
  const meeting = issue.meetingId ? s.meetings.find((m) => m.id === issue.meetingId) : undefined;
  const showMeeting = meeting && canViewMeeting(s, s.currentUserId, meeting);
  const ref = `${repoName(issue.repoId)}#${issue.number}`;

  function toggle() {
    const next = issue.state === "open" ? "closed" : "open";
    setIssueState(issue.id, next);
    toast.success(`Issue ${ref} ${next === "closed" ? "closed" : "reopened"}`, { description: "Simulated, nothing is sent to github.com." });
  }

  return (
    <li data-testid="issue-row" data-issue-id={issue.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-muted/40">
      <IssueStateIcon state={issue.state} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={href} scroll={false} className="text-sm font-medium underline-offset-4 hover:text-primary hover:underline">
            {issue.title}
          </Link>
          {issue.labels.map((l) => (
            <LabelPill key={l} label={l} />
          ))}
          {issue.createdInDemo && <DemoIssueBadge />}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono">{ref}</span>
          <span>
            opened {timeAgo(issue.createdAt)} by {author?.firstName ?? "someone"}
          </span>
          {showMeeting && (
            <Link href={`/calendar/${meeting.id}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
              <CalendarDays className="size-3 shrink-0" aria-hidden />
              <span className="truncate">From meeting: {meeting.title}</span>
            </Link>
          )}
          {task && (
            <Link href={`/tasks?task=${task.id}`} className="inline-flex min-w-0 items-center gap-1 hover:text-foreground">
              <SquareCheck className="size-3 shrink-0" aria-hidden />
              <span className="truncate">Task: {task.title}</span>
            </Link>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {assignee ? (
          <span className="inline-flex">
            <PersonAvatar person={assignee} size="xs" />
            <span className="sr-only">Assigned to {assignee.name}</span>
          </span>
        ) : (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">Unassigned</span>
        )}
        <Button size="xs" variant="ghost" onClick={toggle} aria-label={`${issue.state === "open" ? "Close" : "Reopen"} issue ${ref}`}>
          {issue.state === "open" ? "Close" : "Reopen"}
        </Button>
      </div>
    </li>
  );
}

export function PrRow({ s, pr }: { s: S; pr: PullRequest }) {
  const author = employeeById(pr.authorId);
  const reviewRequested = pr.state === "open" && pr.reviewerIds.includes(s.currentUserId);
  return (
    <li data-testid="pr-row" className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <PrStateIcon state={pr.state} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium">{pr.title}</p>
            {pr.state === "draft" && <Pill>Draft</Pill>}
            {pr.state === "merged" && <Pill tone="ai">Merged</Pill>}
            {reviewRequested && (
              <Pill tone="warning" icon={Eye}>
                Your review
              </Pill>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">
              {repoName(pr.repoId)}#{pr.number}
            </span>
            <span>
              by {author?.firstName ?? "someone"} · {timeAgo(pr.createdAt)}
            </span>
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              <GitBranch className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{pr.branch}</span>
            </span>
            <span className="tabular" aria-label={`${pr.additions} lines added, ${pr.deletions} lines removed`}>
              <span className="text-success">+{pr.additions}</span> <span className="text-danger">−{pr.deletions}</span>
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-7 sm:flex-col sm:items-end sm:gap-1.5 sm:pl-0">
        <ChecksBadge checks={pr.checks} />
        {pr.reviewerIds.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="sr-only">Reviewers: {pr.reviewerIds.map((id) => employeeById(id)?.name).join(", ")}</span>
            <span aria-hidden>Reviewers</span>
            <AvatarStack ids={pr.reviewerIds} max={3} />
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">No reviewers yet</span>
        )}
      </div>
    </li>
  );
}

export function CommitRow({ commit }: { commit: Commit }) {
  const author = employeeById(commit.authorId);
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <PersonAvatar person={author} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{commit.message}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            {author?.name ?? "Someone"} committed {timeAgo(commit.at)}
          </span>
          <span className="font-mono">{repoName(commit.repoId)}</span>
          <span className="inline-flex max-w-full items-center gap-1 font-mono text-[11px]">
            <GitBranch className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{commit.branch}</span>
          </span>
        </p>
      </div>
      <code className="shrink-0 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px]" title="Commit SHA (simulated)">
        {commit.sha.slice(0, 7)}
      </code>
    </li>
  );
}

export function RepoCard({ s, repo }: { s: S; repo: Repository }) {
  const openIssues = s.issues.filter((i) => i.repoId === repo.id && i.state === "open").length;
  const openPrs = s.pullRequests.filter((p) => p.repoId === repo.id && p.state !== "merged").length;
  const project = repo.projectId && canViewProjectId(s, s.currentUserId, repo.projectId) ? s.projects.find((p) => p.id === repo.projectId) : undefined;
  return (
    <article className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card" data-testid="repo-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <FolderGit2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{repo.fullName}</span>
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
        </div>
        {repo.visibility === "restricted" ? (
          <Pill tone="warning" icon={Lock}>
            Restricted
          </Pill>
        ) : (
          <Pill>Internal</Pill>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LanguageDot language={repo.language} />
        <span className="inline-flex items-center gap-1">
          <GitBranch className="size-3.5" aria-hidden /> <span className="font-mono">{repo.defaultBranch}</span>
        </span>
        <span className="inline-flex items-center gap-1 tabular">
          <CircleDot className="size-3.5" aria-hidden /> {openIssues} open issue{openIssues === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 tabular">
          <GitPullRequest className="size-3.5" aria-hidden /> {openPrs} open PR{openPrs === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium text-muted-foreground">Branches ({repo.branches.length})</p>
        <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Branches of ${repo.name}`}>
          {repo.branches.map((b) => (
            <li key={b}>
              <code className={cn("inline-block max-w-full truncate rounded-md border px-1.5 py-0.5 font-mono text-[11px]", b === repo.defaultBranch ? "border-primary/30 bg-accent text-accent-foreground" : "bg-muted/60")}>{b}</code>
            </li>
          ))}
        </ul>
      </div>
      {project && (
        <Link href={`/projects/${project.id}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          <FolderKanban className="size-3.5" aria-hidden /> Linked project: <span className="truncate text-foreground">{project.name}</span>
        </Link>
      )}
    </article>
  );
}
