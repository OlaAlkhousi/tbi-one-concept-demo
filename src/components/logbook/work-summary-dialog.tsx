"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, Info, Loader2, RotateCcw, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { useS, useToday } from "@/components/common/hooks";
import { AiBadge } from "@/components/common/layout";
import { generateWorkSummary } from "@/lib/ai/work-summary";
import { plural } from "@/lib/ai/text";
import { myProjects } from "@/lib/selectors";
import { addDaysISO, formatDate, mondayOf } from "@/lib/time";
import type { ID, ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { countPlaceholders, formFromEntry, logbookSchema, ProjectPicker, SECTIONS, type LogbookForm } from "./shared";

const STEP_MS = 260;

export function WorkSummaryDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: ID) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-3xl" data-testid="summary-dialog">
        <SummaryFlow onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SummaryFlow({ onClose, onSaved }: { onClose: () => void; onSaved: (id: ID) => void }) {
  const s = useS();
  const today = useToday();
  const saveLogbook = useWorkspace((x) => x.saveLogbook);
  const thisMonday = mondayOf(today);
  const lastMonday = addDaysISO(thisMonday, -7);

  const [monday, setMonday] = useState(thisMonday);
  const [summary, setSummary] = useState(() => generateWorkSummary(s, s.currentUserId, thisMonday));
  const [form, setForm] = useState<LogbookForm>(() => formFromEntry(summary.draft));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(() => (prefersReducedMotion() ? Infinity : 0));
  const set = (patch: Partial<LogbookForm>) => setForm((f) => ({ ...f, ...patch }));

  const src = (label: string) => summary.sources.find((x) => x.label === label)?.count ?? 0;
  const checks = [
    { label: "Completed tasks", detail: `${plural(src("Tasks"), "task")} checked` },
    { label: "Meetings", detail: plural(src("Meetings"), "meeting") },
    { label: "Project activity", detail: `${plural(src("GitHub"), "pull request or issue", "pull requests and issues")}` },
    { label: "Learning", detail: plural(src("Learning"), "lesson") },
    { label: "Hours", detail: plural(src("Hours entries"), "registered entry", "registered entries") },
  ];
  const reviewing = step < checks.length + 1;

  // Walks through the checklist so you can see what is being read. Skipped with reduced motion.
  useEffect(() => {
    if (step >= checks.length + 1) return;
    const t = setTimeout(() => setStep((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, checks.length]);

  function generate(m: ISODate) {
    const next = generateWorkSummary(s, s.currentUserId, m);
    setMonday(m);
    setSummary(next);
    setForm(formFromEntry(next.draft));
    setErrors({});
    setStep(prefersReducedMotion() ? Infinity : 0);
  }

  const mine = myProjects(s);
  const projects = [...mine, ...s.projects.filter((p) => form.projectIds.includes(p.id) && !mine.some((x) => x.id === p.id))];
  const existing = s.logbook.find((l) => l.userId === s.currentUserId && l.kind === "weekly" && l.date === monday);
  const placeholders = countPlaceholders(form);

  function save() {
    const parsed = logbookSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    const saved = saveLogbook({ ...parsed.data, title: parsed.data.title.trim(), kind: "weekly", date: monday, generated: true });
    toast.success("Week report saved to your logbook", { description: "Drafted with AI, reviewed by you." });
    onSaved(saved.id);
  }

  const weekOption = (m: ISODate, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={monday === m}
      onClick={() => monday !== m && generate(m)}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-left text-sm transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-none",
        monday === m ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-ai/25" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label} <span className="text-xs text-muted-foreground">· {formatDate(m, "d MMM")}</span>
    </button>
  );

  return (
    <>
      <DialogHeader className="ai-surface border-b border-ai/10 px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Wand2 className="size-4 text-ai" aria-hidden /> Generate My Work Summary
          </DialogTitle>
          <AiBadge />
        </div>
        <DialogDescription>A weekly logbook draft built from what you recorded in TBI ONE. Nothing is saved until you choose to.</DialogDescription>
        <div role="radiogroup" aria-label="Week to summarise" className="mt-1 flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-fit">
          {weekOption(thisMonday, "This week")}
          {weekOption(lastMonday, "Last week")}
        </div>
      </DialogHeader>

      <div className="grid content-start gap-5 overflow-y-auto px-5 py-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
            {reviewing ? "Reviewing your week…" : "Reviewed"}
          </p>
          <ol className="space-y-2" data-testid="summary-checklist">
            {checks.map((c, i) => {
              const state = i < step ? "done" : i === step ? "active" : "pending";
              return (
                <li key={c.label} className={cn("flex items-start gap-2.5 text-sm transition-opacity", state === "pending" && "opacity-45")}>
                  <span className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full", state === "done" ? "bg-success text-background" : "text-ai")} aria-hidden>
                    {state === "done" ? <Check className="size-3" strokeWidth={3} /> : state === "active" ? <Loader2 className="size-4 animate-spin" /> : <Circle className="size-3.5 text-muted-foreground" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{state === "pending" ? "Waiting" : c.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summary.facts.map((f) => (
              <div key={f.label} className="rounded-lg border bg-card/80 p-2.5">
                <p className="text-[11px] leading-tight text-muted-foreground">{f.label}</p>
                <div className="mt-1 text-lg font-semibold tabular">{reviewing ? <Skeleton className="h-6 w-10" /> : f.value}</div>
              </div>
            ))}
          </div>

          <p className="flex gap-2 rounded-lg border border-ai/20 bg-ai-soft/60 px-3 py-2.5 text-xs text-foreground/85">
            <Info className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden />
            <span>Drafted from your recorded activity. Hours come only from your hours registration. Check and edit before saving.</span>
          </p>

          {reviewing ? (
            <div className="space-y-3" aria-hidden>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {existing && (
                <p className="rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-xs text-warning">
                  You already have a weekly report for this week (“{existing.title}”). Saving adds a second one.
                </p>
              )}
              <Field id="sum-title" label="Title" error={errors.title}>
                <Input id="sum-title" value={form.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "sum-title-error" : undefined} />
              </Field>
              {SECTIONS.map((sec) => (
                <Field key={sec.key} id={`sum-${sec.key}`} label={sec.label}>
                  <Textarea id={`sum-${sec.key}`} rows={sec.key === "completed" ? 5 : 3} value={form[sec.key]} onChange={(e) => set({ [sec.key]: e.target.value })} className="bg-card/80" />
                </Field>
              ))}
              <ProjectPicker id="sum-projects" projects={projects} value={form.projectIds} onChange={(ids) => set({ projectIds: ids })} />
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="m-0 items-center px-5 py-3">
        <p className="mr-auto text-xs text-muted-foreground">
          {reviewing ? "Reading your tasks, meetings, GitHub, learning and hours." : placeholders > 0 ? `${plural(placeholders, "placeholder")} in [brackets] still to fill in.` : "Ready to save."}
        </p>
        <Button variant="ghost" onClick={() => generate(monday)} disabled={reviewing}>
          <RotateCcw /> Regenerate
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={reviewing} data-testid="save-summary">
          <Save /> Save to logbook
        </Button>
      </DialogFooter>
    </>
  );
}
