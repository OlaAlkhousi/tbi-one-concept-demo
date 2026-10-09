import { Archive, CalendarDays, CircleAlert, FolderKanban, GitBranch, Inbox, Mail, Star, type LucideIcon } from "lucide-react";
import { employeeById, myOpenTasks, projectById, type S } from "@/lib/selectors";
import { formatDate, relativeDue } from "@/lib/time";
import type { Channel, ISODate, Message, Task } from "@/lib/types";

export const INBOX_FILTERS = ["all", "unread", "important", "action", "meetings", "github", "projects", "archived"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const FILTER_META: Record<InboxFilter, { label: string; icon: LucideIcon; empty: { title: string; description: string } }> = {
  all: { label: "All", icon: Inbox, empty: { title: "Inbox zero", description: "New Teams, Outlook, GitHub and project messages appear here." } },
  unread: { label: "Unread", icon: Mail, empty: { title: "All caught up", description: "You have read every message." } },
  important: { label: "Important", icon: Star, empty: { title: "Nothing marked important", description: "Star a message to find it here quickly." } },
  action: { label: "Needs action", icon: CircleAlert, empty: { title: "Nothing needs action", description: "Messages that ask something of you appear here." } },
  meetings: { label: "Meetings", icon: CalendarDays, empty: { title: "No meeting follow-ups", description: "Meeting summaries and recaps appear here." } },
  github: { label: "GitHub", icon: GitBranch, empty: { title: "No GitHub notifications", description: "Review requests and CI results appear here." } },
  projects: { label: "Projects", icon: FolderKanban, empty: { title: "No project messages", description: "Messages about your projects appear here." } },
  archived: { label: "Archived", icon: Archive, empty: { title: "Archive is empty", description: "Archived messages are kept here, out of your way." } },
};

export function isInboxFilter(v: string | null): v is InboxFilter {
  return v !== null && (INBOX_FILTERS as readonly string[]).includes(v);
}

export function matchesFilter(m: Message, f: InboxFilter): boolean {
  if (f === "archived") return m.archived;
  if (m.archived) return false;
  switch (f) {
    case "all":
      return true;
    case "unread":
      return !m.read;
    case "important":
      return m.important;
    case "action":
      return m.needsAction;
    case "meetings":
      return m.channel === "meeting";
    case "github":
      return m.channel === "github";
    case "projects":
      return Boolean(m.projectId) || m.channel === "project";
  }
}

export const senderName = (m: Message) => employeeById(m.fromId)?.name ?? m.fromName ?? "Unknown sender";

export function matchesSearch(m: Message, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [m.subject, m.body, senderName(m)].some((x) => x.toLowerCase().includes(q));
}

/** Human channel names, always marked as simulated. */
export const CHANNEL_LABEL: Record<Channel, string> = {
  teams: "Teams",
  outlook: "Outlook",
  github: "GitHub",
  project: "Project update",
  meeting: "Meeting follow-up",
  task: "Task assignment",
  approval: "Approval",
  reminder: "Reminder",
};

const PREFIX = /^(re|fw|fwd|aw)\s*:\s*/i;
const stripPrefixes = (subject: string) => {
  let s = subject.trim();
  while (PREFIX.test(s)) s = s.replace(PREFIX, "");
  return s;
};

/** The subject as a topic to quote in a reply: no "Re:" and no notification wording. */
export function subjectTopic(subject: string): string {
  const s = stripPrefixes(subject);
  return /^summary ready:\s*(.+)$/i.exec(s)?.[1] ?? s;
}

/** Turns a message subject into a short, actionable task title. */
export function cleanSubject(subject: string): string {
  let s = stripPrefixes(subject);
  const review = /requested your review on (\S+)/i.exec(s);
  if (review) return `Review ${review[1]}`;
  const assigned = /^\S+ assigned you:\s*(.+)$/i.exec(s);
  if (assigned) s = assigned[1];
  const summary = /^summary ready:\s*(.+)$/i.exec(s);
  if (summary) s = `Follow up on ${summary[1]}`;
  s = s.replace(/[.!?\s]+$/, "");
  return s.length > 120 ? `${s.slice(0, 117).trimEnd()}…` : s;
}

/** Tasks connected to a message: explicitly linked, or created from it. */
export function tasksForMessage(s: S, m: Message): Task[] {
  return s.tasks.filter((t) => m.linkedTaskIds.includes(t.id) || (t.source.type === "message" && t.source.id === m.id));
}

/**
 * A deterministic suggested reply: greets the sender, acknowledges the subject and
 * names a concrete next step from linked tasks, the meeting or the project.
 */
export function draftReply(s: S, m: Message, today: ISODate): string {
  const me = employeeById(s.currentUserId);
  const from = employeeById(m.fromId);
  const topic = subjectTopic(m.subject);
  const greeting = from ? `Hi ${from.firstName},` : "Hello,";
  const openTask = tasksForMessage(s, m).find((t) => t.status !== "done");
  const meeting = s.meetings.find((x) => x.id === m.meetingId);
  const project = projectById(s, m.projectId);

  let next: string;
  if (openTask) {
    const due = openTask.due ? relativeDue(openTask.due, today) : undefined;
    next = `I've added it to my tasks (“${openTask.title}”)${due ? ` — ${due.label.toLowerCase()}` : ""}. I'll let you know when it's done.`;
  } else if (meeting && new Date(meeting.start) > new Date()) {
    next = `I'll make sure it's ready before ${meeting.title} on ${formatDate(meeting.start, "EEEE d MMMM")}.`;
  } else if (meeting) {
    next = "I'll go through the action points from the meeting and turn them into tasks today.";
  } else if (project) {
    const current = myOpenTasks(s).find((t) => t.projectId === project.id);
    next = current ? `I'll pick it up alongside “${current.title}” in ${project.name} and keep you posted.` : `I'll look into it for ${project.name} and keep you posted.`;
  } else if (m.needsAction) {
    next = "I'll pick this up and get back to you shortly.";
  } else {
    next = "Noted, thank you!";
  }

  const signOff = m.channel === "outlook" ? `Kind regards,\n${me?.firstName ?? ""}` : `Thanks,\n${me?.firstName ?? ""}`;
  return `${greeting}\n\nThanks for your message about “${topic}”. ${next}\n\n${signOff}`.trim();
}
