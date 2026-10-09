"use client";

import Link from "next/link";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/common/badges";
import { useS } from "@/components/common/hooks";
import { RichText } from "@/components/common/rich-text";
import { formatDate, timeAgo } from "@/lib/time";
import type { LogbookEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./shared";

export function LogbookEntryCard({ entry, highlighted, onEdit, onDelete }: { entry: LogbookEntry; highlighted: boolean; onEdit: () => void; onDelete: () => void }) {
  const s = useS();
  const weekly = entry.kind === "weekly";
  const sections = SECTIONS.filter((sec) => entry[sec.key].trim());
  const projects = entry.projectIds.map((id) => s.projects.find((p) => p.id === id)).filter((p) => p !== undefined);

  return (
    <article
      id={`entry-${entry.id}`}
      data-testid="logbook-entry"
      aria-labelledby={`entry-${entry.id}-title`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card shadow-card transition-[box-shadow,border-color] duration-500 print:break-inside-avoid print:shadow-none",
        weekly && "border-l-2 border-l-primary",
        highlighted && "border-primary/50 shadow-lift ring-3 ring-primary/25",
      )}
    >
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Pill tone={weekly ? "primary" : "neutral"}>{weekly ? "Weekly report" : "Daily"}</Pill>
            <time dateTime={entry.date}>{weekly ? `Week of ${formatDate(entry.date, "EEE d MMM yyyy")}` : formatDate(entry.date, "EEEE d MMMM yyyy")}</time>
            {entry.generated && (
              <Pill tone="ai" icon={Sparkles}>
                Drafted with AI, reviewed by you
              </Pill>
            )}
          </div>
          <h3 id={`entry-${entry.id}-title`} className="mt-1.5 text-base font-semibold text-balance">
            {entry.title}
          </h3>
          {projects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground">
                  <span className="size-1.5 rounded-full" style={{ background: `oklch(0.6 0.15 ${p.hue})` }} aria-hidden />
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="no-print flex shrink-0 gap-0.5">
          <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`Edit “${entry.title}”`} data-testid="logbook-edit">
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" onClick={onDelete} aria-label={`Delete “${entry.title}”`} data-testid="logbook-delete">
            <Trash2 />
          </Button>
        </div>
      </header>
      {sections.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No details written yet.</p>
      ) : (
        <div className="grid gap-x-8 gap-y-4 px-4 py-4 md:grid-cols-2">
          {sections.map((sec) => (
            <section key={sec.key} className={cn("min-w-0", sec.key === "completed" && "md:col-span-2")}>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <sec.icon className="size-3.5" aria-hidden /> {sec.label}
              </h4>
              <RichText text={entry[sec.key]} className="mt-1.5 text-foreground/90" />
            </section>
          ))}
        </div>
      )}
      <footer className="px-4 pb-3 text-[11px] text-muted-foreground">
        {entry.updatedAt !== entry.createdAt ? `Edited ${timeAgo(entry.updatedAt)}` : `Written ${timeAgo(entry.createdAt)}`}
      </footer>
    </article>
  );
}
