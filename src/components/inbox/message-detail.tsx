"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  GitBranch,
  ListPlus,
  Lock,
  Mail,
  MailOpen,
  Reply,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useS, useToday } from "@/components/common/hooks";
import { AiBadge, ProgressBar } from "@/components/common/layout";
import { Pill, PriorityDot, ProjectStatusBadge, SourceIcon, TaskStatusBadge } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { canViewMeeting, canViewProject } from "@/lib/permissions";
import { employeeById, projectById, projectProgress } from "@/lib/selectors";
import { formatDate, formatTime, relativeDue, timeAgo } from "@/lib/time";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { canSeeTask } from "@/components/tasks/task-utils";
import { CHANNEL_LABEL, cleanSubject, draftReply, senderName, tasksForMessage } from "./inbox-utils";

function ToolbarButton({ label, onClick, children, pressed, testId }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean; testId?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" onClick={onClick} aria-label={label} aria-pressed={pressed} data-testid={testId}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{children}</h3>;
}

/** Reading pane. Keyed by message id by the parent, so the composer resets per message. */
export function MessageDetail({ message: m, onBack }: { message: Message; onBack: () => void }) {
  const s = useS();
  const today = useToday();
  const router = useRouter();
  const markRead = useWorkspace((x) => x.markMessageRead);
  const archive = useWorkspace((x) => x.archiveMessage);
  const toggleImportant = useWorkspace((x) => x.toggleImportant);
  const reply = useWorkspace((x) => x.replyToMessage);
  const [draft, setDraft] = useState<string | null>(null);

  const from = employeeById(m.fromId);
  const sender = senderName(m);
  const channel = `${CHANNEL_LABEL[m.channel]} (simulated)`;
  const project = projectById(s, m.projectId);
  const projectVisible = Boolean(project && canViewProject(s, s.currentUserId, project));
  const meeting = s.meetings.find((x) => x.id === m.meetingId);
  const meetingVisible = Boolean(meeting && canViewMeeting(s, s.currentUserId, meeting));
  const linked = tasksForMessage(s, m).filter((t) => canSeeTask(s, t));

  function createTask() {
    useUi.getState().openTaskDialog({
      initial: {
        title: cleanSubject(m.subject),
        description: `${m.body}\n\nFrom: ${sender}`,
        projectId: projectVisible ? m.projectId : undefined,
        assigneeId: s.currentUserId,
        priority: m.important ? "high" : "medium",
        source: { type: "message", id: m.id },
      },
      onCreated: (taskId) => useWorkspace.getState().linkTaskToMessage(m.id, taskId),
    });
  }

  function toggleArchive() {
    const next = !m.archived;
    archive(m.id, next);
    toast.success(next ? "Message archived" : "Message moved back to the inbox", {
      description: m.subject,
      action: { label: "Undo", onClick: () => archive(m.id, !next) },
    });
  }

  function saveReply() {
    if (!draft?.trim()) return;
    reply(m.id, draft);
    setDraft(null);
    toast.success("Saved in the demo — not sent", { description: `Your reply to ${from?.firstName ?? sender} stays in this demo workspace.` });
  }

  return (
    <article className="@container flex min-h-0 min-w-0 flex-1 flex-col" data-testid="message-detail" aria-labelledby="message-subject">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
        <Button size="sm" variant="ghost" onClick={onBack} className="@2xl/inbox:hidden" aria-label="Back to messages">
          <ArrowLeft /> Back
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton label={m.read ? "Mark as unread" : "Mark as read"} onClick={() => markRead(m.id, !m.read)} testId="message-toggle-read">
            {m.read ? <Mail /> : <MailOpen />}
          </ToolbarButton>
          <ToolbarButton label={m.important ? "Remove important mark" : "Mark as important"} pressed={m.important} onClick={() => toggleImportant(m.id)} testId="message-important">
            <Star className={cn(m.important && "fill-warning text-warning")} />
          </ToolbarButton>
          <ToolbarButton label={m.archived ? "Move back to inbox" : "Archive"} onClick={toggleArchive} testId="message-archive">
            {m.archived ? <ArchiveRestore /> : <Archive />}
          </ToolbarButton>
          <Button size="sm" variant="outline" className="ml-1" onClick={() => useWorkspace.getState().askAssistant("Draft a reply to this message")}>
            <Sparkles className="text-ai" /> Ask assistant
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="px-5 pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-5 items-center gap-1.5 rounded-md bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">{channel}</span>
            {m.needsAction && <Pill tone="danger">Needs action</Pill>}
            {m.important && <Pill tone="warning">Important</Pill>}
            {m.archived && <Pill>Archived</Pill>}
          </div>
          <h2 id="message-subject" className="text-lg font-semibold tracking-tight text-balance">
            {m.subject}
          </h2>
          <div className="mt-3 flex items-center gap-3">
            {from ? <PersonAvatar person={from} size="md" showStatus /> : <SourceIcon source={m.channel} className="size-9" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {sender}
                {from && <span className="font-normal text-muted-foreground"> · {from.role}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                To you · <time dateTime={m.receivedAt}>{formatDate(m.receivedAt, "EEE d MMM, HH:mm")}</time> · {timeAgo(m.receivedAt)}
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 px-5 pt-4">
          {m.channel === "meeting" && m.meetingId && (
            <Button size="sm" onClick={() => router.push(`/calendar/${m.meetingId}?plan=1`)} data-testid="message-open-meeting">
              <Wand2 /> Open meeting & generate action plan
            </Button>
          )}
          {m.channel === "github" && (
            <Button size="sm" onClick={() => router.push("/github")}>
              <GitBranch /> Open GitHub workspace
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={createTask} data-testid="message-create-task">
            <ListPlus /> Create task from message
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDraft(draft ?? draftReply(s, m, today))} data-testid="message-reply">
            <Reply /> Draft reply
          </Button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed whitespace-pre-line">{m.body}</p>
        </div>

        {(project || meeting) && (
          <section className="px-5 pb-5" aria-label="Related">
            <SectionTitle>Related</SectionTitle>
            <div className="grid gap-2 @lg:grid-cols-2">
              {project &&
                (projectVisible ? (
                  <Link href={`/projects/${project.id}`} className="group rounded-lg border p-3 transition hover:border-primary/30 hover:shadow-card" data-testid="message-project">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-primary">{project.name}</p>
                        <p className="text-[11px] text-muted-foreground">{project.code} · project</p>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar value={projectProgress(s, project)} tone={project.status === "blocked" ? "danger" : project.status === "at-risk" ? "warning" : "primary"} label={`${project.name} progress`} />
                      <span className="w-9 text-right text-xs font-semibold tabular">{projectProgress(s, project)}%</span>
                    </div>
                  </Link>
                ) : (
                  <div className="rounded-lg border border-dashed p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Lock className="size-3.5 text-muted-foreground" aria-hidden /> Restricted project
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">This message mentions a project you are not a member of, so its details stay hidden.</p>
                    <Button size="xs" variant="outline" className="mt-2" onClick={() => useUi.getState().openAccessDialog("project", project.id, `Context for the message “${m.subject}”.`)}>
                      Request access
                    </Button>
                  </div>
                ))}
              {meeting && meetingVisible && (
                <Link href={`/calendar/${meeting.id}`} className="group flex items-start gap-3 rounded-lg border p-3 transition hover:border-primary/30 hover:shadow-card" data-testid="message-meeting">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">{meeting.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(meeting.start, "EEE d MMM")} · {formatTime(meeting.start)}–{formatTime(meeting.end)}
                    </p>
                    {meeting.actionPlanCreatedAt ? (
                      <Pill tone="success" className="mt-1.5">
                        Action plan created
                      </Pill>
                    ) : meeting.actionPoints?.length ? (
                      <Pill tone="ai" className="mt-1.5">
                        {meeting.actionPoints.length} action points
                      </Pill>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              )}
            </div>
          </section>
        )}

        {linked.length > 0 && (
          <section className="px-5 pb-5" aria-label="Linked tasks">
            <SectionTitle>Linked tasks</SectionTitle>
            <ul className="divide-y rounded-lg border" data-testid="message-linked-tasks">
              {linked.map((t) => {
                const due = t.due && t.status !== "done" ? relativeDue(t.due, today) : undefined;
                return (
                  <li key={t.id}>
                    <Link href={`/tasks?task=${t.id}`} className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-muted/60">
                      <PriorityDot priority={t.priority} />
                      <span className={cn("min-w-0 flex-1 truncate text-sm", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
                      {due && <span className={cn("shrink-0 text-[11px] font-medium", due.tone === "overdue" ? "text-danger" : due.tone === "soon" ? "text-warning" : "text-muted-foreground")}>{due.label}</span>}
                      <TaskStatusBadge status={t.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {m.replies.length > 0 && (
          <section className="px-5 pb-5" aria-label="Your replies">
            <SectionTitle>Your replies</SectionTitle>
            <ol className="space-y-3">
              {m.replies.map((r) => (
                <li key={r.id} className="flex gap-3" data-testid="message-reply-item">
                  <PersonAvatar id={r.authorId} size="sm" />
                  <div className="min-w-0 flex-1 rounded-lg border bg-muted/40 p-3">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{r.authorId === s.currentUserId ? "You" : employeeById(r.authorId)?.name}</span>
                      <time dateTime={r.at}>{timeAgo(r.at)}</time>
                      <Pill tone="info">Saved in the demo — not sent</Pill>
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line">{r.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {draft !== null && (
          <section className="px-5 pb-6" aria-label="Reply composer">
            <div className="ai-surface rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`reply-${m.id}`} className="text-sm">
                  <Reply className="size-4 text-muted-foreground" aria-hidden /> Reply to {from?.firstName ?? sender}
                </Label>
                <AiBadge />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested draft from this message{linked.length ? ", your linked tasks" : ""}
                {meeting ? " and the meeting" : project ? " and the project" : ""}. Edit it before saving.
              </p>
              <Textarea id={`reply-${m.id}`} rows={7} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-2 bg-card" data-testid="message-reply-body" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={saveReply} disabled={!draft.trim()} data-testid="message-reply-save">
                  Save simulated reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Discard
                </Button>
                <span className="text-[11px] text-muted-foreground sm:ml-auto">Saved in the demo — never sent to {CHANNEL_LABEL[m.channel]}.</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
