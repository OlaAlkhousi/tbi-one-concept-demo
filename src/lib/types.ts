/**
 * Shared domain model for TBI ONE.
 *
 * Every module (dashboard, inbox, projects, GitHub, assistant, …) reads and writes
 * these same types. That shared model is what makes the workspace feel connected:
 * a meeting action becomes a Task, the Task belongs to a Project and can link to a
 * GithubIssue, and all of them show up in the activity feed.
 */

export type ID = string;
/** ISO-8601 timestamp in UTC, e.g. "2026-10-09T07:30:00.000Z". */
export type ISODateTime = string;
/** Calendar date in Europe/Amsterdam, e.g. "2026-10-09". */
export type ISODate = string;

// ─── People & personas ────────────────────────────────────────────────────────

export type Availability = "available" | "busy" | "in-meeting" | "away" | "offline";

export type PersonaKind = "intern" | "developer" | "lead" | "pm";

export interface Employee {
  id: ID;
  name: string;
  firstName: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  location: string;
  skills: string[];
  expertise: string;
  responsibilities: string[];
  availability: Availability;
  managerId?: ID;
  /** Hue (0–360) for the generated avatar. */
  hue: number;
  /** Persona kind for the four demo users; undefined for other colleagues. */
  persona?: PersonaKind;
  /** Can approve access requests and timesheets for these people/projects. */
  approves?: { projectIds: ID[]; teamMemberIds: ID[] };
}

// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus = "on-track" | "at-risk" | "blocked" | "planning" | "completed";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Visibility = "internal" | "restricted";

export interface Milestone {
  id: ID;
  title: string;
  due: ISODate;
  done: boolean;
}

export interface Risk {
  id: ID;
  title: string;
  severity: "low" | "medium" | "high";
  mitigation?: string;
  isBlocker?: boolean;
}

export interface Decision {
  id: ID;
  title: string;
  rationale: string;
  date: ISODate;
  status: "decided" | "open";
  meetingId?: ID;
}

export interface Project {
  id: ID;
  name: string;
  code: string;
  description: string;
  ownerId: ID;
  teamIds: ID[];
  status: ProjectStatus;
  priority: Priority;
  /** 0–100, recalculated from tasks when tasks change. */
  progress: number;
  technologies: string[];
  objectives: string[];
  features: string[];
  milestones: Milestone[];
  risks: Risk[];
  decisions: Decision[];
  start: ISODate;
  end: ISODate;
  visibility: Visibility;
  /** Who decides on access requests for this project. */
  approverId: ID;
  repoIds: ID[];
  /** Search aliases, e.g. "vr", "lending". */
  aliases: string[];
  hue: number;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export type SourceRef =
  | { type: "manual" }
  | { type: "meeting"; id: ID }
  | { type: "message"; id: ID }
  | { type: "insight"; id: ID }
  | { type: "assistant" };

export interface Task {
  id: ID;
  title: string;
  description: string;
  projectId?: ID;
  assigneeId: ID;
  creatorId: ID;
  status: TaskStatus;
  priority: Priority;
  due?: ISODate;
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
  source: SourceRef;
  githubIssueId?: ID;
  tags: string[];
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export interface ActionPoint {
  id: ID;
  /** Text as it appears in the (simulated) meeting summary. */
  text: string;
  /** Who raised it and when, for explainability. */
  mentionedBy: ID;
  timestamp: string;
}

export interface Meeting {
  id: ID;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  projectId?: ID;
  organizerId: ID;
  participantIds: ID[];
  location: string;
  description: string;
  agenda: string[];
  notes?: string;
  /** Simulated AI meeting summary (as Teams/Copilot would provide). */
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  actionPoints?: ActionPoint[];
  /** Task ids created from this meeting's action plan. */
  followUpTaskIds: ID[];
  actionPlanCreatedAt?: ISODateTime;
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

export type Channel =
  | "teams"
  | "outlook"
  | "github"
  | "project"
  | "meeting"
  | "task"
  | "approval"
  | "reminder";

export interface MessageReply {
  id: ID;
  authorId: ID;
  body: string;
  at: ISODateTime;
  /** Always true: replies never leave this demo. */
  simulated: true;
}

export interface Message {
  id: ID;
  recipientId: ID;
  channel: Channel;
  /** Employee id, or a system sender name such as "GitHub". */
  fromId?: ID;
  fromName?: string;
  subject: string;
  body: string;
  receivedAt: ISODateTime;
  read: boolean;
  archived: boolean;
  important: boolean;
  needsAction: boolean;
  projectId?: ID;
  meetingId?: ID;
  replies: MessageReply[];
  linkedTaskIds: ID[];
}

// ─── GitHub (simulated) ──────────────────────────────────────────────────────

export interface Repository {
  id: ID;
  name: string;
  fullName: string;
  description: string;
  language: string;
  projectId?: ID;
  defaultBranch: string;
  branches: string[];
  visibility: Visibility;
}

export interface GithubIssue {
  id: ID;
  repoId: ID;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  assigneeId?: ID;
  authorId: ID;
  createdAt: ISODateTime;
  taskId?: ID;
  meetingId?: ID;
  /** True for issues created inside the demo (never pushed to real GitHub). */
  createdInDemo?: boolean;
}

export interface PullRequest {
  id: ID;
  repoId: ID;
  number: number;
  title: string;
  authorId: ID;
  reviewerIds: ID[];
  state: "open" | "draft" | "merged";
  branch: string;
  additions: number;
  deletions: number;
  checks: "passing" | "failing" | "pending";
  createdAt: ISODateTime;
}

export interface Commit {
  sha: string;
  repoId: ID;
  message: string;
  authorId: ID;
  at: ISODateTime;
  branch: string;
}

// ─── Knowledge ───────────────────────────────────────────────────────────────

export interface DocumentSection {
  heading: string;
  body: string;
}

export interface KnowledgeDocument {
  id: ID;
  title: string;
  category: "Reports" | "Guidelines" | "Onboarding" | "Procedures" | "Security" | "Handbooks" | "Strategy" | "Learning";
  summary: string;
  sections: DocumentSection[];
  tags: string[];
  ownerId: ID;
  updatedAt: ISODate;
  projectIds: ID[];
  visibility: Visibility;
  /** For restricted docs: explicit readers in addition to members of linked projects. */
  allowedUserIds?: ID[];
  source: string;
}

// ─── Learning ────────────────────────────────────────────────────────────────

export interface Lesson {
  id: ID;
  title: string;
  minutes: number;
}

export interface Course {
  id: ID;
  title: string;
  provider: string;
  skill: string;
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  lessons: Lesson[];
}

export interface SkillLevel {
  skill: string;
  level: number; // 0–100
  target: number; // 0–100
}

export interface LearningGoal {
  id: ID;
  title: string;
  due: ISODate;
  done: boolean;
}

export interface LearningProfile {
  userId: ID;
  skills: SkillLevel[];
  goals: LearningGoal[];
  enrolledCourseIds: ID[];
  /** courseId → completed lesson ids */
  completedLessons: Record<ID, ID[]>;
}

// ─── Logbook & hours ─────────────────────────────────────────────────────────

export interface LogbookEntry {
  id: ID;
  userId: ID;
  kind: "daily" | "weekly";
  /** Day for daily entries; Monday of the week for weekly entries. */
  date: ISODate;
  title: string;
  projectIds: ID[];
  completed: string;
  challenges: string;
  learnings: string;
  decisions: string;
  nextSteps: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  generated: boolean;
}

export type HoursStatus = "draft" | "submitted" | "approved" | "rejected";

export interface HoursEntry {
  id: ID;
  userId: ID;
  date: ISODate;
  /** Wall-clock time in Europe/Amsterdam, "HH:mm". */
  start: string;
  end: string;
  breakMinutes: number;
  projectId?: ID;
  description: string;
  status: HoursStatus;
}

// ─── Access ──────────────────────────────────────────────────────────────────

export type ResourceType = "project" | "document";

export interface AccessGrant {
  userId: ID;
  resourceType: ResourceType;
  resourceId: ID;
  grantedBy: ID;
  at: ISODateTime;
}

export interface AccessRequest {
  id: ID;
  requesterId: ID;
  resourceType: ResourceType;
  resourceId: ID;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approverId: ID;
  createdAt: ISODateTime;
  decidedAt?: ISODateTime;
  decisionNote?: string;
}

// ─── News, notifications, activity ───────────────────────────────────────────

export type NewsCategory = "announcement" | "innovation" | "project" | "learning" | "ai" | "event";

export interface NewsItem {
  id: ID;
  title: string;
  category: NewsCategory;
  summary: string;
  body: string;
  date: ISODate;
  /** Personas the item is most relevant to; empty = everyone. */
  audience: PersonaKind[];
  tags: string[];
  projectId?: ID;
}

export interface Notification {
  id: ID;
  userId: ID;
  title: string;
  body: string;
  /** Why this notification matters to this user (explainability). */
  why?: string;
  at: ISODateTime;
  read: boolean;
  href?: string;
}

export type ActivitySource =
  | "teams"
  | "outlook"
  | "github"
  | "project"
  | "tasks"
  | "meeting"
  | "learning"
  | "logbook"
  | "hours"
  | "access"
  | "assistant";

export interface Activity {
  id: ID;
  at: ISODateTime;
  actorId: ID;
  source: ActivitySource;
  text: string;
  href?: string;
  projectId?: ID;
  /** If set, only these users see the item (otherwise: actor + project members). */
  visibleTo?: ID[];
}

// ─── Assistant ───────────────────────────────────────────────────────────────

export interface SourceCard {
  kind: "project" | "task" | "meeting" | "document" | "person" | "issue" | "message" | "course" | "hours" | "logbook";
  id: ID;
  title: string;
  subtitle?: string;
  href: string;
}

export type ProposedAction =
  | { kind: "create-task"; task: TaskDraft }
  | { kind: "create-issue"; issue: IssueDraft }
  | { kind: "draft-message"; channel: "teams" | "outlook"; toId: ID; subject: string; body: string }
  | { kind: "access-request"; resourceType: ResourceType; resourceId: ID; reason: string }
  | { kind: "navigate"; href: string; label: string };

export interface AssistantAction {
  id: ID;
  label: string;
  action: ProposedAction;
  status: "proposed" | "done" | "dismissed";
}

export interface AssistantMessage {
  id: ID;
  role: "user" | "assistant";
  text: string;
  at: ISODateTime;
  sources?: SourceCard[];
  actions?: AssistantAction[];
  followUps?: string[];
  /** Which engine produced this answer. */
  engine?: "demo" | "llm";
}

export interface TaskDraft {
  title: string;
  description: string;
  projectId?: ID;
  assigneeId: ID;
  priority: Priority;
  due?: ISODate;
  source: SourceRef;
  tags?: string[];
  alsoCreateIssue?: boolean;
  /** Link to an existing GitHub issue instead of creating a new one. */
  linkIssueId?: ID;
}

export interface IssueDraft {
  repoId: ID;
  title: string;
  body: string;
  labels: string[];
  assigneeId?: ID;
  taskId?: ID;
  meetingId?: ID;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type WidgetId =
  | "briefing"
  | "priorities"
  | "meetings"
  | "messages"
  | "projects"
  | "hours"
  | "approvals"
  | "github"
  | "activity"
  | "learning"
  | "team";

export interface DashboardLayout {
  order: WidgetId[];
  hidden: WidgetId[];
}
