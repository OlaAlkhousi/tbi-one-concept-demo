"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { useS, useToday } from "@/components/common/hooks";
import { myProjects } from "@/lib/selectors";
import { formatDate, mondayOf } from "@/lib/time";
import type { ID, LogbookEntry } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { formFromEntry, logbookSchema, ProjectPicker, SECTIONS, type LogbookForm } from "./shared";

export function LogbookEditor({ open, editing, onClose, onSaved }: { open: boolean; editing?: LogbookEntry; onClose: () => void; onSaved: (id: ID) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <EditorForm key={editing?.id ?? "new"} editing={editing} onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function EditorForm({ editing, onClose, onSaved }: { editing?: LogbookEntry; onClose: () => void; onSaved: (id: ID) => void }) {
  const s = useS();
  const today = useToday();
  const saveLogbook = useWorkspace((x) => x.saveLogbook);
  const [form, setForm] = useState<LogbookForm>(() =>
    editing ? formFromEntry(editing) : { kind: "daily", date: today, title: "", projectIds: [], completed: "", challenges: "", learnings: "", decisions: "", nextSteps: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<LogbookForm>) => setForm((f) => ({ ...f, ...patch }));

  const mine = myProjects(s);
  const projects = [...mine, ...s.projects.filter((p) => form.projectIds.includes(p.id) && !mine.some((m) => m.id === p.id))];
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = logbookSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    const v = parsed.data;
    // Weekly entries are filed under the Monday of their week.
    const saved = saveLogbook({ ...v, id: editing?.id, title: v.title.trim(), date: v.kind === "weekly" ? mondayOf(v.date) : v.date, generated: editing?.generated ?? false });
    toast.success(editing ? "Logbook entry updated" : "Logbook entry saved", { description: saved.title });
    onSaved(saved.id);
  }

  return (
    <form onSubmit={submit} className="contents" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit logbook entry" : "New logbook entry"}</DialogTitle>
        <DialogDescription className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden /> Private to you. Your manager can&apos;t read your logbook.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-4 grid content-start gap-4 overflow-y-auto px-4 pt-0.5 pb-1">
        <div className="grid gap-4 sm:grid-cols-[160px_180px_1fr]">
          <Field id="lb-kind" label="Type">
            <Select value={form.kind} onValueChange={(v) => set({ kind: v as LogbookForm["kind"] })}>
              <SelectTrigger id="lb-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily entry</SelectItem>
                <SelectItem value="weekly">Weekly report</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id="lb-date" label={form.kind === "weekly" ? "Week of" : "Date"} error={errors.date} hint={form.kind === "weekly" && validDate ? `Filed under ${formatDate(mondayOf(form.date), "EEE d MMM")}` : undefined}>
            <Input id="lb-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={Boolean(errors.date)} />
          </Field>
          <Field id="lb-title" label="Title" error={errors.title}>
            <Input
              id="lb-title"
              data-testid="logbook-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Intake form validation done"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "lb-title-error" : undefined}
            />
          </Field>
        </div>
        <ProjectPicker id="lb-projects" projects={projects} value={form.projectIds} onChange={(ids) => set({ projectIds: ids })} />
        {SECTIONS.map((sec) => (
          <Field key={sec.key} id={`lb-${sec.key}`} label={sec.label}>
            <Textarea id={`lb-${sec.key}`} rows={sec.key === "completed" ? 4 : 2} value={form[sec.key]} onChange={(e) => set({ [sec.key]: e.target.value })} placeholder={sec.placeholder} />
          </Field>
        ))}
      </div>

      <DialogFooter className="mt-0">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" data-testid="logbook-save">
          {editing ? "Save changes" : "Save entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}
