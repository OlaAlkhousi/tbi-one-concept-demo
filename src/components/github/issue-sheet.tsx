"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, CircleDot, FolderKanban, RotateCcw, SquareCheck, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pill, TaskStatusBadge } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { RichText } from "@/components/common/rich-text";
import { canViewMeeting, canViewProjectId } from "@/lib/permissions";
import { employeeById, visibleIssues, type S } from "@/lib/selectors";
import { formatDate, timeAgo } from "@/lib/time";
import type { ID } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { DemoIssueBadge, IssueStateIcon, LabelPill, repoName } from "./shared";
import { repositories } from "@/lib/data/catalog";

/** Detail panel for ?issue=<id>. Issues in repositories the user can't see are reported as unavailable. */
export function IssueSheet({ s, issueId, onClose }: { s: S; issueId: ID | null; onClose: () => void }) {
  const issue = issueId ? visibleIssues(s).find((i) => i.id === issueId) : undefined;
  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg" data-testid="issue-sheet">
        {issue ? <IssueDetail s={s} issueId={issue.id} /> : <Unavailable />}
      </SheetContent>
    </Sheet>
  );
}

function Unavailable() {
  return (
    <SheetHeader className="p-6">
      <SheetTitle>Issue not available</SheetTitle>
      <SheetDescription>This issue doesn&apos;t exist in the demo, or it belongs to a repository you don&apos;t have access to.</SheetDescription>
    </SheetHeader>
  );
}

function IssueDetail({ s, issueId }: { s: S; issueId: ID }) {
  const setIssueState = useWorkspace((x) => x.setIssueState);
  const issue = s.issues.find((i) => i.id === issueId)!;
  const repo = repositories.find((r) => r.id === issue.repoId);
  const author = employeeById(issue.authorId);
  const assignee = employeeById(issue.assigneeId);
  const task = issue.taskId ? s.tasks.find((t) => t.id === issue.taskId) : undefined;
  const meeting = issue.meetingId ? s.meetings.find((m) => m.id === issue.meetingId) : undefined;
  const project = repo?.projectId && canViewProjectId(s, s.currentUserId, repo.projectId) ? s.projects.find((p) => p.id === repo.projectId) : undefined;
  const ref = `${repoName(issue.repoId)}#${issue.number}`;

  function toggle() {
    const next = issue.state === "open" ? "closed" : "open";
    setIssueState(issue.id, next);
    toast.success(`Issue ${ref} ${next === "closed" ? "closed" : "reopened"}`, { description: "Simulated, nothing is sent to github.com." });
  }

  return (
    <>
      <SheetHeader className="border-b p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={issue.state === "open" ? "success" : "ai"}>
            <IssueStateIcon state={issue.state} className="[&_svg]:size-3" />
            {issue.state === "open" ? "Open" : "Closed"}
          </Pill>
          <span className="font-mono text-xs text-muted-foreground">{ref}</span>
          {issue.createdInDemo && <DemoIssueBadge />}
        </div>
        <SheetTitle className="text-lg leading-snug">{issue.title}</SheetTitle>
        <SheetDescription>
          Opened {timeAgo(issue.createdAt)} by {author?.name ?? "someone"} · {formatDate(issue.createdAt, "d MMM yyyy, HH:mm")}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 p-5">
        <section aria-labelledby="issue-body-heading">
          <h3 id="issue-body-heading" className="mb-2 text-xs font-medium text-muted-foreground">
            Description
          </h3>
          {issue.body ? <RichText text={issue.body} className="rounded-lg border bg-muted/30 p-3" /> : <p className="text-sm text-muted-foreground italic">No description provided.</p>}
        </section>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Assignee</dt>
            <dd className="mt-1 flex items-center gap-2">
              {assignee ? (
                <>
                  <PersonAvatar person={assignee} size="xs" /> {assignee.name}
                </>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Labels</dt>
            <dd className="mt-1 flex flex-wrap gap-1">{issue.labels.length ? issue.labels.map((l) => <LabelPill key={l} label={l} />) : <span className="text-muted-foreground">None</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Repository</dt>
            <dd className="mt-1 truncate font-mono text-xs">{repo?.fullName}</dd>
          </div>
          {project && (
            <div>
              <dt className="text-xs text-muted-foreground">Project</dt>
              <dd className="mt-1">
                <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
                  <FolderKanban className="size-3.5 text-muted-foreground" aria-hidden /> {project.name}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        {(task || meeting) && (
          <section aria-labelledby="issue-links-heading">
            <h3 id="issue-links-heading" className="mb-2 text-xs font-medium text-muted-foreground">
              Linked in TBI ONE
            </h3>
            <ul className="space-y-2">
              {task && (
                <li>
                  <Link href={`/tasks?task=${task.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/60">
                    <SquareCheck className="size-4 shrink-0 text-success" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Task · {employeeById(task.assigneeId)?.name}</p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </Link>
                </li>
              )}
              {meeting && canViewMeeting(s, s.currentUserId, meeting) && (
                <li>
                  <Link href={`/calendar/${meeting.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/60">
                    <CalendarDays className="size-4 shrink-0 text-[oklch(0.6_0.15_45)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">Originating meeting · {formatDate(meeting.start, "EEE d MMM")}</p>
                    </div>
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button variant={issue.state === "open" ? "outline" : "default"} onClick={toggle}>
            {issue.state === "open" ? <CircleCheck /> : <RotateCcw />}
            {issue.state === "open" ? "Close issue" : "Reopen issue"}
          </Button>
          <p className="text-xs text-muted-foreground">
            <CircleDot className="mr-1 inline size-3" aria-hidden />
            Changes stay in this demo workspace.
          </p>
        </div>
      </div>
    </>
  );
}
