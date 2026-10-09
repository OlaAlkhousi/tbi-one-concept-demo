"use client";

import { ArrowRightCircle, CheckCircle2, Lightbulb, Mountain, Scale, type LucideIcon } from "lucide-react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import type { ID, LogbookEntry, Project } from "@/lib/types";

export type SectionKey = "completed" | "challenges" | "learnings" | "decisions" | "nextSteps";

export const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon; placeholder: string }[] = [
  { key: "completed", label: "Completed work", icon: CheckCircle2, placeholder: "What did you finish? One line per item, starting with “- ”." },
  { key: "challenges", label: "Challenges", icon: Mountain, placeholder: "What was difficult, and how did you handle it?" },
  { key: "learnings", label: "Learning moments", icon: Lightbulb, placeholder: "What did you learn, in your own words?" },
  { key: "decisions", label: "Decisions", icon: Scale, placeholder: "Decisions made by you or your team." },
  { key: "nextSteps", label: "Next steps", icon: ArrowRightCircle, placeholder: "What comes next?" },
];

export const logbookSchema = z.object({
  kind: z.enum(["daily", "weekly"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  title: z.string().trim().min(3, "Give the entry a title of at least 3 characters").max(120, "Keep the title under 120 characters"),
  projectIds: z.array(z.string()),
  completed: z.string().max(4000),
  challenges: z.string().max(4000),
  learnings: z.string().max(4000),
  decisions: z.string().max(4000),
  nextSteps: z.string().max(4000),
});

export type LogbookForm = z.input<typeof logbookSchema>;

export const formFromEntry = (e: Pick<LogbookEntry, keyof LogbookForm>): LogbookForm => ({
  kind: e.kind,
  date: e.date,
  title: e.title,
  projectIds: [...e.projectIds],
  completed: e.completed,
  challenges: e.challenges,
  learnings: e.learnings,
  decisions: e.decisions,
  nextSteps: e.nextSteps,
});

/** Placeholders like "[Add what was difficult…]" that a generated draft leaves for the author. */
export const countPlaceholders = (f: LogbookForm) => SECTIONS.reduce((n, s) => n + (f[s.key].match(/\[[^\]]+\]/g)?.length ?? 0), 0);

export function ProjectPicker({ id, projects, value, onChange }: { id: string; projects: Project[]; value: ID[]; onChange: (ids: ID[]) => void }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Projects</legend>
      {projects.length === 0 ? (
        <p className="text-xs text-muted-foreground">You are not a member of any project.</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {projects.map((p) => {
            const cid = `${id}-${p.id}`;
            const checked = value.includes(p.id);
            return (
              <label key={p.id} htmlFor={cid} className="flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition hover:bg-muted/60 has-data-checked:border-primary/40 has-data-checked:bg-accent/50">
                <Checkbox id={cid} checked={checked} onCheckedChange={(c) => onChange(c ? [...value, p.id] : value.filter((x) => x !== p.id))} />
                <span className="truncate">{p.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
