"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { employees } from "@/lib/data/people";
import { repoById, visibleProjects } from "@/lib/selectors";
import { addDaysISO, toISODate } from "@/lib/time";
import type { Priority } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "./hooks";
import { Field, NONE } from "./field";

const schema = z.object({
  title: z.string().trim().min(3, "Give the task a title of at least 3 characters").max(120, "Keep the title under 120 characters"),
  description: z.string().max(2000),
  projectId: z.string().optional(),
  assigneeId: z.string().min(1, "Choose who does this"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due: z.string().optional(),
});

type FormState = z.input<typeof schema> & { alsoCreateIssue: boolean };

export function TaskDialog() {
  const { taskDialog, closeTaskDialog } = useUi();
  const s = useS();
  const createTask = useWorkspace((x) => x.createTask);
  const updateTask = useWorkspace((x) => x.updateTask);
  const editing = taskDialog.editId ? s.tasks.find((t) => t.id === taskDialog.editId) : undefined;
  const [form, setForm] = useState<FormState>(() => blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function blank(): FormState {
    return { title: "", description: "", projectId: undefined, assigneeId: s.currentUserId, priority: "medium", due: addDaysISO(toISODate(), 3), alsoCreateIssue: false };
  }

  useEffect(() => {
    if (!taskDialog.open) return;
    setErrors({});
    if (editing) {
      setForm({ title: editing.title, description: editing.description, projectId: editing.projectId, assigneeId: editing.assigneeId, priority: editing.priority, due: editing.due, alsoCreateIssue: false });
    } else {
      const i = taskDialog.initial ?? {};
      setForm({ ...blank(), ...i, description: i.description ?? "", alsoCreateIssue: Boolean(i.alsoCreateIssue) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskDialog.open, taskDialog.editId]);

  const projects = visibleProjects(s);
  const project = projects.find((p) => p.id === form.projectId);
  const people = project ? employees.filter((e) => project.teamIds.includes(e.id)) : employees;
  const repo = project ? repoById(project.repoIds[0]) : undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    const v = parsed.data;
    if (editing) {
      updateTask(editing.id, { title: v.title, description: v.description, projectId: v.projectId, assigneeId: v.assigneeId, priority: v.priority as Priority, due: v.due || undefined });
      toast.success("Task updated");
    } else {
      const task = createTask({
        title: v.title,
        description: v.description,
        projectId: v.projectId,
        assigneeId: v.assigneeId,
        priority: v.priority as Priority,
        due: v.due || undefined,
        source: taskDialog.initial?.source ?? { type: "manual" },
        tags: taskDialog.initial?.tags,
        alsoCreateIssue: form.alsoCreateIssue && Boolean(repo),
      });
      taskDialog.onCreated?.(task.id);
      toast.success("Task created", { description: form.alsoCreateIssue && repo ? `Also opened a simulated issue in ${repo.name}.` : task.title });
    }
    closeTaskDialog();
  }

  return (
    <Dialog open={taskDialog.open} onOpenChange={(o) => !o && closeTaskDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>{editing ? "Changes are saved in this demo workspace." : "Tasks appear in My Tasks, the project and the dashboard."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field id="task-title" label="Title" error={errors.title}>
            <Input id="task-title" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "task-title-error" : undefined} />
          </Field>
          <Field id="task-desc" label="Description">
            <Textarea id="task-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="task-project" label="Project">
              <Select value={form.projectId ?? NONE} onValueChange={(v) => setForm({ ...form, projectId: v === NONE ? undefined : v, alsoCreateIssue: v === NONE ? false : form.alsoCreateIssue })}>
                <SelectTrigger id="task-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No project (personal)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="task-assignee" label="Owner" error={errors.assigneeId}>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger id="task-assignee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.id === s.currentUserId ? " (you)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="task-priority" label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="task-due" label="Deadline">
              <Input id="task-due" type="date" value={form.due ?? ""} onChange={(e) => setForm({ ...form, due: e.target.value || undefined })} />
            </Field>
          </div>
          {!editing && repo && (
            <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <GitBranch className="size-4 text-muted-foreground" aria-hidden />
                Also create a simulated GitHub issue in <span className="font-mono text-xs">{repo.name}</span>
              </span>
              <Switch checked={form.alsoCreateIssue} onCheckedChange={(c) => setForm({ ...form, alsoCreateIssue: c })} aria-label="Also create a simulated GitHub issue" />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeTaskDialog}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
