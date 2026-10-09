"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, NONE } from "@/components/common/field";
import { useS } from "@/components/common/hooks";
import { entryMinutes, formatHours, hoursEntrySchema } from "@/lib/hours";
import { myProjects } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { HoursEntry, ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function HoursEntryDialog({
  open,
  editing,
  defaultDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: HoursEntry;
  defaultDate: ISODate;
  onClose: () => void;
  onSaved: (date: ISODate) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted only while open, so every opening starts from a fresh form. */}
        <HoursForm key={editing?.id ?? "new"} editing={editing} defaultDate={defaultDate} onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function HoursForm({ editing, defaultDate, onClose, onSaved }: { editing?: HoursEntry; defaultDate: ISODate; onClose: () => void; onSaved: (date: ISODate) => void }) {
  const s = useS();
  const addHours = useWorkspace((x) => x.addHours);
  const updateHours = useWorkspace((x) => x.updateHours);

  const projects = myProjects(s);
  const extra = editing?.projectId && !projects.some((p) => p.id === editing.projectId) ? s.projects.filter((p) => p.id === editing.projectId) : [];
  const projectOptions = [...projects, ...extra];

  const [form, setForm] = useState(() => {
    if (editing) return { date: editing.date, start: editing.start, end: editing.end, breakMinutes: String(editing.breakMinutes), projectId: editing.projectId ?? NONE, description: editing.description };
    // Start from the project of the most recent entry: people mostly continue where they left off.
    const last = s.hours.filter((h) => h.userId === s.currentUserId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0];
    const lastProject = last?.projectId && projects.some((p) => p.id === last.projectId) ? last.projectId : NONE;
    return { date: defaultDate, start: "08:30", end: "17:00", breakMinutes: "30", projectId: lastProject, description: "" };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const breakMin = Number(form.breakMinutes) || 0;
  const timesValid = timeRe.test(form.start) && timeRe.test(form.end) && /^\d{4}-\d{2}-\d{2}$/.test(form.date);
  const minutes = timesValid ? entryMinutes({ date: form.date, start: form.start, end: form.end, breakMinutes: breakMin }) : NaN;
  // On the nights the clocks change, real elapsed time differs from the wall-clock difference.
  const naive = timesValid ? toMin(form.end) - toMin(form.start) - breakMin : NaN;
  const dstShift = Number.isFinite(minutes) && minutes !== naive ? minutes - naive : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = hoursEntrySchema.safeParse({
      date: form.date,
      start: form.start,
      end: form.end,
      breakMinutes: Number(form.breakMinutes),
      projectId: form.projectId === NONE ? undefined : form.projectId,
      description: form.description,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    const v = parsed.data;
    const entry = { date: v.date, start: v.start, end: v.end, breakMinutes: v.breakMinutes, projectId: v.projectId, description: v.description.trim() };
    if (editing) updateHours(editing.id, entry);
    else addHours(entry);
    toast.success(editing ? "Entry updated" : "Hours added", { description: `${formatHours(entryMinutes(entry) / 60)} h on ${formatDate(entry.date, "EEE d MMM")} · saved as draft` });
    onSaved(entry.date);
  }

  // Links a control to the error text that <Field id=…> renders as `${id}-error`.
  const err = (k: string, fieldId: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${fieldId}-error` } : {});

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit hours" : "Add hours"}</DialogTitle>
        <DialogDescription>Times are Amsterdam time. Entries stay drafts until you submit the week.</DialogDescription>
      </DialogHeader>

      {editing?.status === "rejected" && (
        <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">
          This entry was returned by your manager. Saving turns it back into a draft; submit the week again when you are done.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="hours-date" label="Date" error={errors.date} className="sm:col-span-2">
          <Input id="hours-date" type="date" data-testid="hours-date" value={form.date} onChange={(e) => set({ date: e.target.value })} {...err("date", "hours-date")} />
        </Field>
        <Field id="hours-start" label="Start" error={errors.start}>
          <Input id="hours-start" type="time" data-testid="hours-start" value={form.start} onChange={(e) => set({ start: e.target.value })} {...err("start", "hours-start")} />
        </Field>
        <Field id="hours-end" label="End" error={errors.end}>
          <Input id="hours-end" type="time" data-testid="hours-end" value={form.end} onChange={(e) => set({ end: e.target.value })} {...err("end", "hours-end")} />
        </Field>
        <Field id="hours-break" label="Break (minutes)" error={errors.breakMinutes}>
          <Input id="hours-break" type="number" inputMode="numeric" min={0} max={240} step={5} data-testid="hours-break" value={form.breakMinutes} onChange={(e) => set({ breakMinutes: e.target.value })} {...err("breakMinutes", "hours-break")} />
        </Field>
        <Field id="hours-project" label="Project">
          <Select value={form.projectId} onValueChange={(v) => set({ projectId: v })}>
            <SelectTrigger id="hours-project" data-testid="hours-project" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No project / learning</SelectItem>
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="hours-description" label="What did you work on?" error={errors.description} hint={`${form.description.length}/280`} className="sm:col-span-2">
          <Textarea
            id="hours-description"
            data-testid="hours-description"
            rows={2}
            maxLength={280}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Availability check for the reservation calendar"
            {...err("description", "hours-description")}
          />
        </Field>
      </div>

      <div className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5", Number.isFinite(minutes) && minutes > 0 ? "bg-accent/50" : "bg-muted/40")} aria-live="polite">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calculator className="size-4" aria-hidden /> Calculated
        </span>
        <span className="text-sm font-semibold tabular" data-testid="hours-preview">
          {Number.isFinite(minutes) && minutes > 0 ? `${formatHours(minutes / 60)} h` : "0:00 h"}
        </span>
      </div>
      {dstShift !== 0 && (
        <p className="-mt-2 flex items-start gap-1.5 text-xs text-info">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          The clocks change on this date. The calculation uses the real elapsed time ({dstShift > 0 ? "+" : "−"}
          {formatHours(Math.abs(dstShift) / 60)}).
        </p>
      )}

      <DialogFooter className="items-center">
        <p className="mr-auto hidden text-xs text-muted-foreground sm:block">Saved as a draft. Your manager sees it after you submit the week.</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" data-testid="hours-save">
          {editing ? "Save changes" : "Save entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}
