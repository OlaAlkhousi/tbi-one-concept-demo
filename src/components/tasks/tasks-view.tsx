"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CheckSquare, Columns3, ListChecks, ListTodo, Plus, Search, SearchX, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { EmptyState, PageHeader, StatCard } from "@/components/common/layout";
import { NONE } from "@/components/common/field";
import { projectById, visibleProjects } from "@/lib/selectors";
import type { ID, Priority, Task } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { TaskBoard } from "./task-board";
import { TaskDetailSheet } from "./task-detail";
import { TaskList } from "./task-list";
import { SCOPE_LABEL, groupTasks, inScope, taskStats, type TaskScope } from "./task-utils";

const ALL = "all";

/** My Tasks. URL: ?task=<id> opens the detail sheet. */
export function TasksView() {
  const s = useS();
  const today = useToday();
  const router = useRouter();
  const params = useSearchParams();
  const taskId = params.get("task");
  usePageContext({ kind: "page", label: "My Tasks" });

  const [view, setView] = useState<"list" | "board">("list");
  const [scope, setScope] = useState<TaskScope>("mine");
  const [projectId, setProjectId] = useState<string>(ALL);
  const [priority, setPriority] = useState<Priority | typeof ALL>(ALL);
  const [query, setQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const stats = taskStats(s, today);
  const projects = visibleProjects(s);
  const q = query.trim().toLowerCase();
  const matchesQuery = (t: Task) => !q || [t.title, t.description, projectById(s, t.projectId)?.name ?? "", ...t.tags].some((x) => x.toLowerCase().includes(q));

  const filtered = s.tasks.filter(
    (t) =>
      inScope(s, t, scope) &&
      (projectId === ALL || (projectId === NONE ? !t.projectId : t.projectId === projectId)) &&
      (priority === ALL || t.priority === priority) &&
      matchesQuery(t),
  );
  const shown = showCompleted ? filtered : filtered.filter((t) => t.status !== "done");
  const groups = groupTasks(shown, today);
  const filtersActive = projectId !== ALL || priority !== ALL || q.length > 0;
  const hiddenDone = filtered.length - shown.length;

  const open = (id: ID) => router.replace(`/tasks?task=${encodeURIComponent(id)}`, { scroll: false });
  const close = () => router.replace("/tasks", { scroll: false });
  const clearFilters = () => {
    setProjectId(ALL);
    setPriority(ALL);
    setQuery("");
  };

  const empty = filtersActive ? (
    <EmptyState
      icon={SearchX}
      title="No tasks match these filters"
      description={`Nothing in “${SCOPE_LABEL[scope]}” matches the project, priority or search you picked.`}
      action={
        <Button size="sm" variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      }
      className="bg-card"
    />
  ) : (
    <EmptyState
      icon={CheckCircle2}
      title={hiddenDone > 0 ? "Everything here is done" : "No tasks yet"}
      description={hiddenDone > 0 ? `${hiddenDone} completed task${hiddenDone === 1 ? " is" : "s are"} hidden.` : "Create a task, or turn a message or meeting action point into one."}
      action={
        hiddenDone > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setShowCompleted(true)}>
            Show completed
          </Button>
        ) : (
          <Button size="sm" onClick={() => useUi.getState().openTaskDialog()}>
            <Plus /> New task
          </Button>
        )
      }
      className="bg-card"
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        icon={CheckSquare}
        description="Everything on your plate, from meetings, messages, the assistant and your projects. Grouped by deadline in Amsterdam time."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => useWorkspace.getState().askAssistant("What should I focus on today?")}>
              <Sparkles className="text-ai" /> Prioritise with AI
            </Button>
            <Button size="sm" onClick={() => useUi.getState().openTaskDialog()} data-testid="new-task">
              <Plus /> New task
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Task summary">
        <StatCard label="Open" value={stats.open} hint="To finish" icon={ListTodo} />
        <StatCard label="Due today" value={stats.dueToday} hint={stats.dueToday ? "Finish today" : "Nothing due"} icon={CalendarClock} tone={stats.dueToday ? "warning" : "default"} />
        <StatCard label="Overdue" value={stats.overdue} hint={stats.overdue ? "Past deadline" : "None overdue"} icon={AlertTriangle} tone={stats.overdue ? "danger" : "success"} />
        <StatCard label="Completed this week" value={stats.completedThisWeek} hint="Since Monday" icon={CheckCircle2} tone="success" />
      </section>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "board")} className="gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList aria-label="Task view">
              <TabsTrigger value="list" data-testid="view-list">
                <ListChecks /> List
              </TabsTrigger>
              <TabsTrigger value="board" data-testid="view-board">
                <Columns3 /> Board
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} data-testid="show-completed" />
              <Label htmlFor="show-completed" className="text-sm font-normal text-muted-foreground">
                Show completed
              </Label>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_210px_210px_150px]">
            <InputGroup className="sm:col-span-2 lg:col-span-1">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, description, project or tag" aria-label="Search tasks" data-testid="task-search" />
              {query && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" onClick={() => setQuery("")} aria-label="Clear search">
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <Select value={scope} onValueChange={(v) => setScope(v as TaskScope)}>
              <SelectTrigger className="w-full" aria-label="Whose tasks" data-testid="task-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_LABEL) as TaskScope[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SCOPE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full" aria-label="Project" data-testid="task-project-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All projects</SelectItem>
                <SelectItem value={NONE}>No project (personal)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority | typeof ALL)}>
              <SelectTrigger className="w-full" aria-label="Priority" data-testid="task-priority-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">{groups.length === 0 ? empty : <TaskList s={s} groups={groups} today={today} onOpen={open} />}</TabsContent>
        <TabsContent value="board">
          {filtered.length === 0 ? empty : <TaskBoard s={s} tasks={shown} today={today} showCompleted={showCompleted} onShowCompleted={() => setShowCompleted(true)} onOpen={open} />}
        </TabsContent>
      </Tabs>

      <TaskDetailSheet taskId={taskId} onClose={close} onOpen={open} />
    </div>
  );
}
