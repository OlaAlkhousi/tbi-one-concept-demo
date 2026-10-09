"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeed, defaultLayouts, type SeedData } from "@/lib/data/seed";
import { employees } from "@/lib/data/people";
import { documents } from "@/lib/data/catalog";
import { approverFor } from "@/lib/permissions";
import { weekDates } from "@/lib/time";
import { uid } from "@/lib/utils-id";
import type {
  Activity,
  AssistantAction,
  AssistantMessage,
  DashboardLayout,
  GithubIssue,
  HoursEntry,
  ID,
  ISODate,
  IssueDraft,
  LogbookEntry,
  Notification,
  ResourceType,
  Task,
  TaskDraft,
  TaskStatus,
  WidgetId,
} from "@/lib/types";

/** What the user is looking at, so the assistant can answer "this project" questions. */
export interface PageContext {
  kind: "project" | "meeting" | "document" | "message" | "page";
  id?: ID;
  label: string;
}

export interface WorkspaceState extends SeedData {
  currentUserId: ID;
  conversations: Record<ID, AssistantMessage[]>;
  /** "demo" = local deterministic engine; "llm" = optional server-side model (if configured). */
  assistantMode: "demo" | "llm";
  // UI (not persisted)
  assistantOpen: boolean;
  commandOpen: boolean;
  sidebarCollapsed: boolean;
  pageContext: PageContext | null;
  pendingAssistantPrompt: string | null;
}

export interface WorkspaceActions {
  switchUser(userId: ID): void;
  resetDemo(): void;

  createTask(draft: TaskDraft): Task;
  updateTask(id: ID, patch: Partial<Omit<Task, "id">>): void;
  setTaskStatus(id: ID, status: TaskStatus): void;
  deleteTask(id: ID): void;

  createIssue(draft: IssueDraft): GithubIssue;
  setIssueState(id: ID, state: GithubIssue["state"]): void;
  createActionPlan(meetingId: ID, drafts: TaskDraft[], repoId?: ID): Task[];

  markMessageRead(id: ID, read?: boolean): void;
  archiveMessage(id: ID, archived?: boolean): void;
  toggleImportant(id: ID): void;
  replyToMessage(id: ID, body: string): void;
  linkTaskToMessage(messageId: ID, taskId: ID): void;

  addHours(entry: Omit<HoursEntry, "id" | "userId" | "status">): void;
  updateHours(id: ID, patch: Partial<Omit<HoursEntry, "id" | "userId">>): void;
  deleteHours(id: ID): void;
  submitWeek(monday: ISODate): number;
  decideWeek(userId: ID, monday: ISODate, approve: boolean): void;

  saveLogbook(entry: Omit<LogbookEntry, "id" | "userId" | "createdAt" | "updatedAt"> & { id?: ID }): LogbookEntry;
  deleteLogbook(id: ID): void;

  toggleLesson(courseId: ID, lessonId: ID): void;
  enroll(courseId: ID): void;
  toggleGoal(goalId: ID): void;

  requestAccess(resourceType: ResourceType, resourceId: ID, reason: string): void;
  decideAccess(requestId: ID, approve: boolean, note?: string): void;

  toggleBookmark(newsId: ID): void;
  markNotificationRead(id: ID): void;
  markAllNotificationsRead(): void;

  setLayout(layout: DashboardLayout): void;
  resetLayout(): void;

  addAssistantMessage(message: AssistantMessage): void;
  setAssistantActionStatus(messageId: ID, actionId: ID, status: AssistantAction["status"]): void;
  clearConversation(): void;
  setAssistantMode(mode: "demo" | "llm"): void;

  setAssistantOpen(open: boolean): void;
  askAssistant(prompt: string): void;
  consumePendingPrompt(): string | null;
  setCommandOpen(open: boolean): void;
  toggleSidebar(): void;
  setPageContext(ctx: PageContext | null): void;
}

export type Workspace = WorkspaceState & WorkspaceActions;

const nowISO = () => new Date().toISOString();
const nameOf = (id: ID) => employees.find((e) => e.id === id)?.name ?? "Someone";

function initialState(): WorkspaceState {
  return {
    ...createSeed(),
    currentUserId: "u-ola",
    conversations: {},
    assistantMode: "demo",
    assistantOpen: false,
    commandOpen: false,
    sidebarCollapsed: false,
    pageContext: null,
    pendingAssistantPrompt: null,
  };
}

export const useWorkspace = create<Workspace>()(
  persist(
    (set, get) => {
      /** Prepends an activity item. */
      const log = (a: Omit<Activity, "id" | "at" | "actorId"> & { actorId?: ID }) =>
        set((s) => ({ activity: [{ id: uid("a"), at: nowISO(), actorId: a.actorId ?? s.currentUserId, ...a }, ...s.activity] }));

      const notify = (n: Omit<Notification, "id" | "at" | "read">) =>
        set((s) => ({ notifications: [{ id: uid("no"), at: nowISO(), read: false, ...n }, ...s.notifications] }));

      return {
        ...initialState(),

        switchUser: (userId) => set({ currentUserId: userId, pageContext: null }),

        resetDemo: () => {
          const fresh = initialState();
          set({ ...fresh, currentUserId: get().currentUserId, sidebarCollapsed: get().sidebarCollapsed, assistantMode: get().assistantMode });
        },

        // ─── Tasks & issues ────────────────────────────────────────────────
        createTask: (draft) => {
          const me = get().currentUserId;
          const task: Task = {
            id: uid("t"),
            title: draft.title.trim(),
            description: draft.description.trim(),
            projectId: draft.projectId,
            assigneeId: draft.assigneeId,
            creatorId: me,
            status: "todo",
            priority: draft.priority,
            due: draft.due,
            createdAt: nowISO(),
            source: draft.source,
            tags: draft.tags ?? [],
          };
          set((s) => ({ tasks: [task, ...s.tasks] }));
          const via =
            draft.source.type === "meeting" ? " from a meeting" : draft.source.type === "message" ? " from a message" : draft.source.type === "insight" ? " from an AI insight" : draft.source.type === "assistant" ? " with the assistant" : "";
          log({ source: "tasks", text: `created task ${task.title}${via}`, href: `/tasks?task=${task.id}`, projectId: task.projectId });
          if (task.assigneeId !== me) {
            notify({ userId: task.assigneeId, title: "New task assigned", body: `${nameOf(me)} assigned you: ${task.title}`, why: "You are the assignee.", href: `/tasks?task=${task.id}` });
          }
          if (draft.alsoCreateIssue) {
            const repoId = get().projects.find((p) => p.id === task.projectId)?.repoIds[0];
            if (repoId) get().createIssue({ repoId, title: task.title, body: task.description, labels: ["from-tbi-one"], assigneeId: task.assigneeId, taskId: task.id });
          }
          return get().tasks.find((x) => x.id === task.id)!;
        },

        updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

        setTaskStatus: (id, status) => {
          const task = get().tasks.find((t) => t.id === id);
          if (!task || task.status === status) return;
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, completedAt: status === "done" ? nowISO() : undefined } : t)),
          }));
          if (status === "done") {
            log({ source: "tasks", text: `completed ${task.title}`, href: `/tasks?task=${id}`, projectId: task.projectId });
            // Closing the task also closes its simulated GitHub issue.
            if (task.githubIssueId) get().setIssueState(task.githubIssueId, "closed");
          }
        },

        deleteTask: (id) =>
          set((s) => ({
            tasks: s.tasks.filter((t) => t.id !== id),
            // Keep references consistent: no message, meeting or issue points at a deleted task.
            messages: s.messages.map((m) => (m.linkedTaskIds.includes(id) ? { ...m, linkedTaskIds: m.linkedTaskIds.filter((x) => x !== id) } : m)),
            meetings: s.meetings.map((m) => (m.followUpTaskIds.includes(id) ? { ...m, followUpTaskIds: m.followUpTaskIds.filter((x) => x !== id) } : m)),
            issues: s.issues.map((i) => (i.taskId === id ? { ...i, taskId: undefined } : i)),
          })),

        createIssue: (draft) => {
          const s = get();
          const number = Math.max(0, ...s.issues.filter((i) => i.repoId === draft.repoId).map((i) => i.number), ...s.pullRequests.filter((p) => p.repoId === draft.repoId).map((p) => p.number)) + 1;
          const issue: GithubIssue = {
            id: uid("i"),
            repoId: draft.repoId,
            number,
            title: draft.title.trim(),
            body: draft.body.trim(),
            state: "open",
            labels: draft.labels,
            assigneeId: draft.assigneeId,
            authorId: s.currentUserId,
            createdAt: nowISO(),
            taskId: draft.taskId,
            meetingId: draft.meetingId,
            createdInDemo: true,
          };
          set((st) => ({
            issues: [issue, ...st.issues],
            tasks: draft.taskId ? st.tasks.map((t) => (t.id === draft.taskId ? { ...t, githubIssueId: issue.id } : t)) : st.tasks,
          }));
          const repo = s.projects.find((p) => p.repoIds.includes(draft.repoId));
          log({ source: "github", text: `opened simulated issue #${number} ${issue.title}`, href: `/github?issue=${issue.id}`, projectId: repo?.id });
          return issue;
        },

        setIssueState: (id, state) => set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, state } : i)) })),

        createActionPlan: (meetingId, drafts, repoId) => {
          const meeting = get().meetings.find((m) => m.id === meetingId);
          if (!meeting) return [];
          const created: Task[] = [];
          for (const d of drafts) {
            const task = get().createTask({ ...d, alsoCreateIssue: false, source: { type: "meeting", id: meetingId } });
            if (d.linkIssueId) {
              const issueId = d.linkIssueId;
              set((s) => ({
                tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, githubIssueId: issueId } : t)),
                issues: s.issues.map((i) => (i.id === issueId ? { ...i, taskId: task.id, assigneeId: i.assigneeId ?? task.assigneeId } : i)),
              }));
            } else if (d.alsoCreateIssue) {
              const rid = repoId ?? get().projects.find((p) => p.id === d.projectId)?.repoIds[0];
              if (rid) get().createIssue({ repoId: rid, title: task.title, body: `${task.description}\n\nOrigin: ${meeting.title}`, labels: ["from-meeting"], assigneeId: task.assigneeId, taskId: task.id, meetingId });
            }
            created.push(get().tasks.find((t) => t.id === task.id)!);
          }
          set((s) => ({
            meetings: s.meetings.map((m) =>
              m.id === meetingId ? { ...m, followUpTaskIds: [...m.followUpTaskIds, ...created.map((t) => t.id)], actionPlanCreatedAt: nowISO() } : m,
            ),
            messages: s.messages.map((msg) => (msg.meetingId === meetingId && msg.channel === "meeting" && msg.recipientId === s.currentUserId ? { ...msg, needsAction: false, read: true } : msg)),
          }));
          log({ source: "meeting", text: `turned ${meeting.title} into ${created.length} follow-up task${created.length === 1 ? "" : "s"}`, href: `/calendar/${meetingId}`, projectId: meeting.projectId });
          return created;
        },

        // ─── Inbox ────────────────────────────────────────────────────────
        markMessageRead: (id, read = true) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, read } : m)) })),
        archiveMessage: (id, archived = true) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, archived, read: true } : m)) })),
        toggleImportant: (id) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, important: !m.important } : m)) })),
        replyToMessage: (id, body) => {
          const me = get().currentUserId;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === id ? { ...m, read: true, needsAction: false, replies: [...m.replies, { id: uid("r"), authorId: me, body: body.trim(), at: nowISO(), simulated: true }] } : m,
            ),
          }));
          const m = get().messages.find((x) => x.id === id);
          log({ source: m?.channel === "outlook" ? "outlook" : "teams", text: `replied to "${m?.subject}" (simulated, not sent)`, href: `/inbox?m=${id}`, visibleTo: [me] });
        },
        linkTaskToMessage: (messageId, taskId) =>
          set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, linkedTaskIds: [...m.linkedTaskIds, taskId], needsAction: false } : m)) })),

        // ─── Hours ────────────────────────────────────────────────────────
        addHours: (entry) => {
          const me = get().currentUserId;
          set((s) => ({ hours: [...s.hours, { ...entry, id: uid("h"), userId: me, status: "draft" }] }));
        },
        updateHours: (id, patch) => set((s) => ({ hours: s.hours.map((h) => (h.id === id && (h.status === "draft" || h.status === "rejected") ? { ...h, ...patch, status: "draft" } : h)) })),
        deleteHours: (id) => set((s) => ({ hours: s.hours.filter((h) => !(h.id === id && h.status === "draft")) })),
        submitWeek: (monday) => {
          const me = get().currentUserId;
          const days = new Set(weekDates(monday));
          const ids = get().hours.filter((h) => h.userId === me && days.has(h.date) && (h.status === "draft" || h.status === "rejected")).map((h) => h.id);
          if (ids.length === 0) return 0;
          set((s) => ({ hours: s.hours.map((h) => (ids.includes(h.id) ? { ...h, status: "submitted" } : h)) }));
          const manager = employees.find((e) => e.id === me)?.managerId;
          log({ source: "hours", text: `submitted hours for the week of ${monday} (simulated)`, href: "/hours", visibleTo: manager ? [me, manager] : [me] });
          if (manager) notify({ userId: manager, title: "Timesheet submitted", body: `${nameOf(me)} submitted hours for the week of ${monday}.`, why: "You approve timesheets for your team.", href: "/hours" });
          return ids.length;
        },
        decideWeek: (userId, monday, approve) => {
          const days = new Set(weekDates(monday));
          set((s) => ({ hours: s.hours.map((h) => (h.userId === userId && days.has(h.date) && h.status === "submitted" ? { ...h, status: approve ? "approved" : "rejected" } : h)) }));
          const me = get().currentUserId;
          notify({ userId, title: approve ? "Hours approved" : "Hours returned", body: `${nameOf(me)} ${approve ? "approved" : "returned"} your hours for the week of ${monday}.`, why: approve ? undefined : "Please check and resubmit.", href: "/hours" });
          log({ source: "hours", text: `${approve ? "approved" : "returned"} hours of ${nameOf(userId)} for the week of ${monday}`, href: "/hours", visibleTo: [me, userId] });
        },

        // ─── Logbook ──────────────────────────────────────────────────────
        saveLogbook: (entry) => {
          const me = get().currentUserId;
          const existing = entry.id ? get().logbook.find((l) => l.id === entry.id) : undefined;
          const saved: LogbookEntry = existing
            ? { ...existing, ...entry, id: existing.id, updatedAt: nowISO() }
            : { ...entry, id: uid("lb"), userId: me, createdAt: nowISO(), updatedAt: nowISO() };
          set((s) => ({ logbook: existing ? s.logbook.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...s.logbook] }));
          if (!existing) log({ source: "logbook", text: `added a ${saved.kind} logbook entry${saved.generated ? " (drafted with AI, reviewed)" : ""}`, href: `/logbook?entry=${saved.id}`, visibleTo: [me] });
          return saved;
        },
        deleteLogbook: (id) => set((s) => ({ logbook: s.logbook.filter((l) => l.id !== id) })),

        // ─── Learning ─────────────────────────────────────────────────────
        toggleLesson: (courseId, lessonId) => {
          const me = get().currentUserId;
          let completedNow = false;
          set((s) => ({
            learning: s.learning.map((p) => {
              if (p.userId !== me) return p;
              const done = p.completedLessons[courseId] ?? [];
              completedNow = !done.includes(lessonId);
              const next = completedNow ? [...done, lessonId] : done.filter((l) => l !== lessonId);
              return {
                ...p,
                enrolledCourseIds: p.enrolledCourseIds.includes(courseId) ? p.enrolledCourseIds : [...p.enrolledCourseIds, courseId],
                completedLessons: { ...p.completedLessons, [courseId]: next },
              };
            }),
          }));
          if (completedNow) log({ source: "learning", text: `completed a lesson in ${courseId.replace("c-", "").toUpperCase()}`, href: "/learning", visibleTo: [me] });
        },
        enroll: (courseId) => {
          const me = get().currentUserId;
          set((s) => ({
            learning: s.learning.map((p) => (p.userId === me && !p.enrolledCourseIds.includes(courseId) ? { ...p, enrolledCourseIds: [...p.enrolledCourseIds, courseId] } : p)),
          }));
        },
        toggleGoal: (goalId) => {
          const me = get().currentUserId;
          set((s) => ({ learning: s.learning.map((p) => (p.userId === me ? { ...p, goals: p.goals.map((g) => (g.id === goalId ? { ...g, done: !g.done } : g)) } : p)) }));
        },

        // ─── Access ───────────────────────────────────────────────────────
        requestAccess: (resourceType, resourceId, reason) => {
          const s = get();
          const resource = resourceType === "project" ? s.projects.find((p) => p.id === resourceId) : documents.find((d) => d.id === resourceId);
          if (!resource) return;
          if (s.accessRequests.some((r) => r.requesterId === s.currentUserId && r.resourceId === resourceId && r.status === "pending")) return;
          const approverId = approverFor(s, resourceType, resource);
          const name = "name" in resource ? resource.name : resource.title;
          set((st) => ({
            accessRequests: [
              { id: uid("ar"), requesterId: st.currentUserId, resourceType, resourceId, reason: reason.trim(), status: "pending", approverId, createdAt: nowISO() },
              ...st.accessRequests,
            ],
          }));
          notify({ userId: approverId, title: "Access request waiting", body: `${nameOf(s.currentUserId)} requests access to ${name}.`, why: "You are the approver for this restricted resource.", href: "/requests" });
          log({ source: "access", text: `requested access to ${name}`, href: "/requests", visibleTo: [s.currentUserId, approverId] });
        },
        decideAccess: (requestId, approve, note) => {
          const s = get();
          const req = s.accessRequests.find((r) => r.id === requestId);
          if (!req || req.status !== "pending" || req.approverId !== s.currentUserId) return;
          const resource = req.resourceType === "project" ? s.projects.find((p) => p.id === req.resourceId) : documents.find((d) => d.id === req.resourceId);
          const name = resource ? ("name" in resource ? resource.name : resource.title) : req.resourceId;
          set((st) => ({
            accessRequests: st.accessRequests.map((r) => (r.id === requestId ? { ...r, status: approve ? "approved" : "rejected", decidedAt: nowISO(), decisionNote: note?.trim() || undefined } : r)),
            accessGrants: approve
              ? [...st.accessGrants, { userId: req.requesterId, resourceType: req.resourceType, resourceId: req.resourceId, grantedBy: st.currentUserId, at: nowISO() }]
              : st.accessGrants,
          }));
          const href = req.resourceType === "project" ? `/projects/${req.resourceId}` : `/knowledge?doc=${req.resourceId}`;
          notify({
            userId: req.requesterId,
            title: approve ? "Access granted" : "Access request declined",
            body: `${nameOf(s.currentUserId)} ${approve ? "approved" : "declined"} your request for ${name}.${note ? ` “${note}”` : ""}`,
            why: approve ? "You can now open it." : undefined,
            href: approve ? href : "/requests",
          });
          log({ source: "access", text: `${approve ? "approved" : "declined"} ${nameOf(req.requesterId)}'s access to ${name}`, href: "/requests", visibleTo: [s.currentUserId, req.requesterId] });
        },

        // ─── News & notifications ─────────────────────────────────────────
        toggleBookmark: (newsId) =>
          set((s) => {
            const mine = s.bookmarks[s.currentUserId] ?? [];
            return { bookmarks: { ...s.bookmarks, [s.currentUserId]: mine.includes(newsId) ? mine.filter((x) => x !== newsId) : [...mine, newsId] } };
          }),
        markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => (n.userId === s.currentUserId ? { ...n, read: true } : n)) })),

        // ─── Dashboard ────────────────────────────────────────────────────
        setLayout: (layout) => set((s) => ({ layouts: { ...s.layouts, [s.currentUserId]: layout } })),
        resetLayout: () =>
          set((s) => ({ layouts: { ...s.layouts, [s.currentUserId]: { order: (defaultLayouts[s.currentUserId] ?? defaultLayouts["u-ola"]) as WidgetId[], hidden: [] } } })),

        // ─── Assistant ────────────────────────────────────────────────────
        addAssistantMessage: (message) =>
          set((s) => ({ conversations: { ...s.conversations, [s.currentUserId]: [...(s.conversations[s.currentUserId] ?? []), message] } })),
        setAssistantActionStatus: (messageId, actionId, status) =>
          set((s) => ({
            conversations: {
              ...s.conversations,
              [s.currentUserId]: (s.conversations[s.currentUserId] ?? []).map((m) =>
                m.id === messageId ? { ...m, actions: m.actions?.map((a) => (a.id === actionId ? { ...a, status } : a)) } : m,
              ),
            },
          })),
        clearConversation: () => set((s) => ({ conversations: { ...s.conversations, [s.currentUserId]: [] } })),
        setAssistantMode: (mode) => set({ assistantMode: mode }),

        // ─── UI ───────────────────────────────────────────────────────────
        setAssistantOpen: (open) => set({ assistantOpen: open }),
        askAssistant: (prompt) => set({ assistantOpen: true, pendingAssistantPrompt: prompt }),
        consumePendingPrompt: () => {
          const p = get().pendingAssistantPrompt;
          if (p !== null) set({ pendingAssistantPrompt: null });
          return p;
        },
        setCommandOpen: (open) => set({ commandOpen: open }),
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        setPageContext: (ctx) => set({ pageContext: ctx }),
      };
    },
    {
      name: "tbi-one-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { assistantOpen, commandOpen, pageContext, pendingAssistantPrompt, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<Workspace>;
      },
    },
  ),
);

/** Non-hook access for tests and services. */
export const workspace = useWorkspace;
