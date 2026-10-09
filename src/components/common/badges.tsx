import {
  Bell,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderKanban,
  GitBranch,
  GraduationCap,
  Mail,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivitySource, Channel, HoursStatus, Priority, ProjectStatus, TaskStatus } from "@/lib/types";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "ai";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-accent text-accent-foreground ring-primary/15",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
  ai: "bg-ai-soft text-ai ring-ai/20",
};

export function Pill({ tone = "neutral", children, className, icon: Icon }: { tone?: Tone; children: React.ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset", toneClass[tone], className)}>
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

const projectStatus: Record<ProjectStatus, [string, Tone]> = {
  "on-track": ["On track", "success"],
  "at-risk": ["At risk", "warning"],
  blocked: ["Blocked", "danger"],
  planning: ["Planning", "info"],
  completed: ["Completed", "neutral"],
};
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const [label, tone] = projectStatus[status];
  return (
    <Pill tone={tone}>
      <span className={cn("size-1.5 rounded-full", tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : tone === "info" ? "bg-info" : "bg-muted-foreground")} />
      {label}
    </Pill>
  );
}

const taskStatus: Record<TaskStatus, [string, Tone]> = {
  todo: ["To do", "neutral"],
  "in-progress": ["In progress", "info"],
  review: ["In review", "ai"],
  done: ["Done", "success"],
};
export const taskStatusLabel = (s: TaskStatus) => taskStatus[s][0];
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const [label, tone] = taskStatus[status];
  return <Pill tone={tone}>{label}</Pill>;
}

const priority: Record<Priority, [string, Tone]> = {
  urgent: ["Urgent", "danger"],
  high: ["High", "warning"],
  medium: ["Medium", "info"],
  low: ["Low", "neutral"],
};
export function PriorityBadge({ priority: p }: { priority: Priority }) {
  const [label, tone] = priority[p];
  return <Pill tone={tone}>{label}</Pill>;
}

export function PriorityDot({ priority: p }: { priority: Priority }) {
  const color = p === "urgent" ? "bg-danger" : p === "high" ? "bg-warning" : p === "medium" ? "bg-info" : "bg-muted-foreground/40";
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", color)} title={`${priority[p][0]} priority`} />;
}

const hoursStatus: Record<HoursStatus | "empty", [string, Tone]> = {
  draft: ["Draft", "neutral"],
  submitted: ["Submitted", "info"],
  approved: ["Approved", "success"],
  rejected: ["Returned", "danger"],
  empty: ["No entries", "neutral"],
};
export function HoursStatusBadge({ status }: { status: HoursStatus | "empty" }) {
  const [label, tone] = hoursStatus[status];
  return <Pill tone={tone}>{label}</Pill>;
}

/** Where a piece of information comes from. Every feed item shows its source. */
export const sourceMeta: Record<ActivitySource | Channel, { label: string; icon: LucideIcon; className: string }> = {
  teams: { label: "Teams", icon: MessagesSquare, className: "text-[oklch(0.55_0.15_280)] bg-[oklch(0.55_0.15_280/0.1)]" },
  outlook: { label: "Outlook", icon: Mail, className: "text-[oklch(0.55_0.14_240)] bg-[oklch(0.55_0.14_240/0.1)]" },
  github: { label: "GitHub", icon: GitBranch, className: "text-foreground bg-foreground/[0.07]" },
  project: { label: "Projects", icon: FolderKanban, className: "text-[oklch(0.55_0.13_200)] bg-[oklch(0.55_0.13_200/0.1)]" },
  tasks: { label: "Tasks", icon: CheckSquare, className: "text-success bg-success/10" },
  task: { label: "Task", icon: CheckSquare, className: "text-success bg-success/10" },
  meeting: { label: "Meetings", icon: CalendarDays, className: "text-[oklch(0.6_0.15_45)] bg-[oklch(0.6_0.15_45/0.1)]" },
  learning: { label: "Learning", icon: GraduationCap, className: "text-[oklch(0.58_0.15_330)] bg-[oklch(0.58_0.15_330/0.1)]" },
  logbook: { label: "Logbook", icon: NotebookPen, className: "text-[oklch(0.55_0.12_170)] bg-[oklch(0.55_0.12_170/0.1)]" },
  hours: { label: "Hours", icon: Clock, className: "text-info bg-info/10" },
  access: { label: "Access", icon: ShieldCheck, className: "text-warning bg-warning/10" },
  approval: { label: "Approval", icon: ShieldCheck, className: "text-warning bg-warning/10" },
  assistant: { label: "Assistant", icon: Sparkles, className: "text-ai bg-ai/10" },
  reminder: { label: "Reminder", icon: Bell, className: "text-muted-foreground bg-muted" },
};

export function SourceIcon({ source, className }: { source: ActivitySource | Channel; className?: string }) {
  const meta = sourceMeta[source];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg", meta.className, className)} title={meta.label}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function SourceLabel({ source }: { source: ActivitySource | Channel }) {
  const meta = sourceMeta[source];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium", meta.className)}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}

