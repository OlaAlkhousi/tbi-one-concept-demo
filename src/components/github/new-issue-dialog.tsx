"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Check, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, NONE } from "@/components/common/field";
import { useS } from "@/components/common/hooks";
import { employees } from "@/lib/data/people";
import { canViewProjectId } from "@/lib/permissions";
import { myProjects, visibleRepos } from "@/lib/selectors";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { ISSUE_LABELS, labelTone } from "./shared";

const schema = z.object({
  repoId: z.string().min(1, "Choose a repository"),
  title: z.string().trim().min(5, "Give the issue a title of at least 5 characters").max(140, "Keep the title under 140 characters"),
  body: z.string().max(4000, "Keep the description under 4000 characters"),
});

const toneRing: Record<string, string> = {
  danger: "data-[on=true]:bg-danger-soft data-[on=true]:text-danger data-[on=true]:ring-danger/30",
  info: "data-[on=true]:bg-info-soft data-[on=true]:text-info data-[on=true]:ring-info/30",
  primary: "data-[on=true]:bg-accent data-[on=true]:text-accent-foreground data-[on=true]:ring-primary/30",
  ai: "data-[on=true]:bg-ai-soft data-[on=true]:text-ai data-[on=true]:ring-ai/30",
};

/** Dialog shell; the form remounts on every open so it always starts clean. */
export function NewIssueDialog({ open, onOpenChange, defaultRepoId }: { open: boolean; onOpenChange: (open: boolean) => void; defaultRepoId?: ID }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>Creates a simulated issue in this demo. Nothing is sent to github.com.</DialogDescription>
        </DialogHeader>
        {open && <NewIssueForm defaultRepoId={defaultRepoId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewIssueForm({ defaultRepoId, onDone }: { defaultRepoId?: ID; onDone: () => void }) {
  const s = useS();
  const router = useRouter();
  const createIssue = useWorkspace((x) => x.createIssue);
  const createTask = useWorkspace((x) => x.createTask);
  const repos = visibleRepos(s);
  const myRepoIds = myProjects(s).flatMap((p) => p.repoIds);
  const initialRepo = repos.find((r) => r.id === defaultRepoId) ?? repos.find((r) => myRepoIds.includes(r.id)) ?? repos[0];

  const [repoId, setRepoId] = useState(initialRepo?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>(NONE);
  const [alsoTask, setAlsoTask] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const repo = repos.find((r) => r.id === repoId);
  const project = repo?.projectId && canViewProjectId(s, s.currentUserId, repo.projectId) ? s.projects.find((p) => p.id === repo.projectId) : undefined;
  const people = project ? employees.filter((e) => project.teamIds.includes(e.id)) : employees;

  function changeRepo(id: string) {
    setRepoId(id);
    const next = repos.find((r) => r.id === id);
    const team = next?.projectId ? s.projects.find((p) => p.id === next.projectId)?.teamIds : undefined;
    if (team && assigneeId !== NONE && !team.includes(assigneeId)) setAssigneeId(NONE);
  }

  const toggleLabel = (l: string) => setLabels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ repoId, title, body });
    if (!parsed.success || !repo) {
      const found = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
      setErrors(repo ? found : { repoId: "Choose a repository", ...found });
      return;
    }
    const v = parsed.data;
    const assignee = assigneeId === NONE ? undefined : assigneeId;
    let taskId: ID | undefined;
    if (alsoTask) {
      const task = createTask({
        title: v.title,
        description: v.body,
        projectId: project?.id,
        assigneeId: assignee ?? s.currentUserId,
        priority: labels.includes("bug") ? "high" : "medium",
        source: { type: "manual" },
        tags: labels,
      });
      taskId = task.id;
    }
    const issue = createIssue({ repoId: repo.id, title: v.title, body: v.body, labels, assigneeId: assignee, taskId });
    toast.success(`Simulated issue #${issue.number} created`, {
      description: `${repo.name}${taskId ? " · linked task created" : ""}. Nothing was sent to github.com.`,
      action: { label: "View", onClick: () => router.push(`/github?tab=issues&issue=${issue.id}`) },
    });
    onDone();
  }

  if (repos.length === 0) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to any repositories yet.</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field id="issue-repo" label="Repository" error={errors.repoId}>
        <Select value={repoId} onValueChange={changeRepo}>
          <SelectTrigger id="issue-repo" className="w-full" data-testid="issue-repo" aria-invalid={Boolean(errors.repoId)}>
            <SelectValue placeholder="Choose a repository" />
          </SelectTrigger>
          <SelectContent>
            {repos.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="issue-title" label="Title" error={errors.title}>
        <Input
          id="issue-title"
          data-testid="issue-title"
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: "" });
          }}
          placeholder="e.g. Calendar loses focus after choosing a date"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "issue-title-error" : undefined}
        />
      </Field>
      <Field id="issue-body" label="Description" error={errors.body} hint="What happens, what should happen, and how to reproduce it.">
        <Textarea id="issue-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Labels</legend>
        <div className="flex flex-wrap gap-1.5">
          {ISSUE_LABELS.map((l) => {
            const on = labels.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                data-on={on}
                onClick={() => toggleLabel(l)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium ring-1 ring-border transition ring-inset hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  toneRing[labelTone(l) ?? "primary"] ?? toneRing.primary,
                )}
              >
                {on && <Check className="size-3" aria-hidden />}
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field id="issue-assignee" label="Assignee">
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger id="issue-assignee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.id === s.currentUserId ? `${p.name} (you)` : p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
        <div className="min-w-0">
          <Label htmlFor="issue-also-task" className="text-sm font-medium">
            Also create a linked task
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adds it to My Tasks{project ? ` in ${project.name}` : ""} for {assigneeId === NONE ? "you" : (employees.find((e) => e.id === assigneeId)?.firstName ?? "the assignee")}, linked to this issue.
          </p>
        </div>
        <Switch id="issue-also-task" checked={alsoTask} onCheckedChange={setAlsoTask} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" data-testid="issue-submit">
          <CircleDot /> Create issue
        </Button>
      </DialogFooter>
    </form>
  );
}
