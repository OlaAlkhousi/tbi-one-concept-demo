"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Activity as ActivityIcon, ArrowLeft, CalendarDays, FileText, FolderKanban, GitBranch, LayoutDashboard, ListChecks, Lock, MessageSquareText, Plus, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestrictedNotice } from "@/components/common/access";
import { Pill, PriorityBadge, ProjectStatusBadge } from "@/components/common/badges";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { AvatarStack, PersonAvatar } from "@/components/common/person-avatar";
import { InsightsTab } from "@/components/projects/insights-tab";
import { OverviewTab } from "@/components/projects/overview-tab";
import { ProgressRing, accentStyle, progressTone } from "@/components/projects/project-visuals";
import { DecisionsTab, DocumentsTab, GithubTab } from "@/components/projects/record-tabs";
import { ActivityTab, MeetingsTab, TasksTab } from "@/components/projects/work-tabs";
import { canViewProject } from "@/lib/permissions";
import { employeeById, projectProgress, type S } from "@/lib/selectors";
import { daysBetween, formatDate } from "@/lib/time";
import type { Project } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useActiveTabInView } from "@/components/projects/use-active-tab-in-view";

const TABS = ["overview", "tasks", "activity", "meetings", "documents", "decisions", "github", "insights"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProjectDetail />
    </Suspense>
  );
}

const backLink = (
  <Link href="/projects" className="inline-flex items-center gap-1 transition hover:text-foreground">
    <ArrowLeft className="size-3" aria-hidden /> Projects
  </Link>
);

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useS();
  const project = s.projects.find((p) => p.id === id);
  const readable = project ? canViewProject(s, s.currentUserId, project) : false;
  // A restricted project only tells the assistant that the user is looking at a locked page.
  usePageContext(project && readable ? { kind: "project", id: project.id, label: project.name } : { kind: "page", label: project ? "Restricted project" : "Project not found" });

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={backLink} title="Project not found" icon={FolderKanban} />
        <EmptyState
          icon={FolderKanban}
          title="This project doesn't exist"
          description="It may have been removed, or the link is wrong."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/projects">Back to projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!readable) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={backLink} title={project.name} icon={Lock} />
        <RestrictedNotice resourceType="project" resourceId={project.id} name={project.name} ownerId={project.ownerId} approverId={project.approverId} />
      </div>
    );
  }

  return <ReadableProject s={s} project={project} />;
}

function ReadableProject({ s, project: p }: { s: S; project: Project }) {
  const today = useToday();
  const params = useSearchParams();
  const askAssistant = useWorkspace((x) => x.askAssistant);
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "overview";
  const tabScroller = useActiveTabInView<HTMLDivElement>(tab);

  const pct = projectProgress(s, p);
  const owner = employeeById(p.ownerId);
  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const doneMs = p.milestones.filter((m) => m.done).length;
  const left = daysBetween(today, p.end);
  const openIssues = s.issues.filter((i) => p.repoIds.includes(i.repoId) && i.state === "open").length;

  const tabs: { value: Tab; label: string; icon: typeof ListChecks; count?: number }[] = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "tasks", label: "Tasks", icon: ListChecks, count: tasks.length - doneTasks },
    { value: "activity", label: "Activity", icon: ActivityIcon },
    { value: "meetings", label: "Meetings", icon: CalendarDays },
    { value: "documents", label: "Documents", icon: FileText },
    { value: "decisions", label: "Decisions", icon: Scale, count: p.decisions.filter((d) => d.status === "open").length || undefined },
    { value: "github", label: "GitHub", icon: GitBranch, count: openIssues || undefined },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={backLink}
        title={
          <>
            <span className="min-w-0">{p.name}</span>
            <Pill className="font-mono">{p.code}</Pill>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => askAssistant(`What is the progress of ${p.name}?`)} data-testid="ask-project">
              <MessageSquareText /> Ask assistant about this project
            </Button>
            <Button size="sm" onClick={() => openTaskDialog({ initial: { projectId: p.id } })} data-testid="project-new-task">
              <Plus /> New task
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-card shadow-card" aria-label="Project summary">
        <div className="h-1" style={accentStyle(p.hue)} aria-hidden />
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-4">
            <ProgressRing value={pct} tone={progressTone(p.status)} label={`${p.name} progress`} />
            <div className="text-xs text-muted-foreground sm:hidden">
              <p>
                {doneTasks}/{tasks.length} tasks done
              </p>
              <p>
                {doneMs}/{p.milestones.length} milestones
              </p>
            </div>
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                <ProjectStatusBadge status={p.status} />
                <PriorityBadge priority={p.priority} />
                {p.visibility === "restricted" && (
                  <Pill tone="warning" icon={Lock}>
                    Restricted
                  </Pill>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Owner</dt>
              <dd className="mt-1.5 flex min-w-0 items-center gap-2">
                <PersonAvatar person={owner} size="xs" />
                <span className="truncate font-medium">{owner?.name}</span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Timeline</dt>
              <dd className="mt-1.5">
                <span className="font-medium tabular">
                  {formatDate(p.start, "d MMM")} – {formatDate(p.end, "d MMM yyyy")}
                </span>
                <span className="block text-xs text-muted-foreground">{left > 0 ? `${left} days left` : left === 0 ? "Ends today" : `Ended ${-left} days ago`}</span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Team</dt>
              <dd className="mt-1.5 flex items-center gap-2">
                <AvatarStack ids={p.teamIds} max={6} size="sm" />
                <span className="sr-only">{p.teamIds.map((x) => employeeById(x)?.name).join(", ")}</span>
              </dd>
            </div>
          </dl>
          <div className="hidden shrink-0 border-l pl-5 text-xs text-muted-foreground sm:block">
            <p>
              <span className="font-semibold text-foreground tabular">
                {doneTasks}/{tasks.length}
              </span>{" "}
              tasks done
            </p>
            <p className="mt-1">
              <span className="font-semibold text-foreground tabular">
                {doneMs}/{p.milestones.length}
              </span>{" "}
              milestones
            </p>
            <p className="mt-1 text-[11px]">Live from tasks and milestones</p>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(v) => window.history.replaceState(null, "", v === "overview" ? `/projects/${p.id}` : `/projects/${p.id}?tab=${v}`)} className="gap-4">
        <div ref={tabScroller} className="-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                <t.icon /> {t.label}
                {t.count ? <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground tabular">{t.count}</span> : null}
              </TabsTrigger>
            ))}
            <TabsTrigger value="insights" data-testid="tab-insights" className="text-ai data-active:text-ai dark:data-active:text-ai">
              <Sparkles /> AI Insights
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview">
          <OverviewTab s={s} project={p} today={today} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab s={s} project={p} today={today} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab s={s} project={p} />
        </TabsContent>
        <TabsContent value="meetings">
          <MeetingsTab s={s} project={p} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab s={s} project={p} />
        </TabsContent>
        <TabsContent value="decisions">
          <DecisionsTab s={s} project={p} />
        </TabsContent>
        <TabsContent value="github">
          <GithubTab s={s} project={p} />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsTab s={s} project={p} today={today} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
