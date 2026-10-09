"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Bookmark, CalendarDays, ChevronDown, FolderKanban, GraduationCap, Lightbulb, Megaphone, Sparkles, Wand2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canViewProjectId } from "@/lib/permissions";
import type { S } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { NewsCategory, NewsItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { Pill } from "@/components/common/badges";
import { newsRelevance } from "./feed";

export const categoryMeta: Record<NewsCategory, { icon: LucideIcon; tone: "primary" | "info" | "success" | "warning" | "ai" | "neutral"; singular: string }> = {
  announcement: { icon: Megaphone, tone: "warning", singular: "Announcement" },
  innovation: { icon: Lightbulb, tone: "primary", singular: "Innovation" },
  project: { icon: FolderKanban, tone: "info", singular: "Project" },
  learning: { icon: GraduationCap, tone: "success", singular: "Learning" },
  ai: { icon: Wand2, tone: "ai", singular: "AI" },
  event: { icon: CalendarDays, tone: "neutral", singular: "Event" },
};

export function NewsCard({ s, item }: { s: S; item: NewsItem }) {
  const toggleBookmark = useWorkspace((x) => x.toggleBookmark);
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const saved = (s.bookmarks[s.currentUserId] ?? []).includes(item.id);
  const meta = categoryMeta[item.category];
  const project = item.projectId && canViewProjectId(s, s.currentUserId, item.projectId) ? s.projects.find((p) => p.id === item.projectId) : undefined;
  const { reason } = newsRelevance(s, item);

  return (
    <article data-testid="news-card" className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone={meta.tone} icon={meta.icon}>
            {meta.singular}
          </Pill>
          <time dateTime={item.date}>{formatDate(item.date, "EEE d MMM yyyy")}</time>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={saved}
          aria-label={`Bookmark: ${item.title}`}
          data-testid="bookmark-toggle"
          onClick={() => {
            toggleBookmark(item.id);
            toast(saved ? "Bookmark removed" : "Saved to your bookmarks", { description: item.title });
          }}
          className={cn(saved && "text-primary")}
        >
          <Bookmark className={cn(saved && "fill-current")} />
        </Button>
      </div>

      <h3 className="mt-2 text-base font-semibold tracking-tight text-balance">{item.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
      <div id={bodyId} hidden={!expanded} className="mt-3 text-sm leading-relaxed text-foreground/85">
        {item.body}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
        {project && (
          <Link href={`/projects/${project.id}`} className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
            <FolderKanban className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{project.name}</span>
          </Link>
        )}
        {item.tags.length > 0 && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {item.tags
              .slice(0, 3)
              .map((t) => `#${t}`)
              .join(" ")}
          </span>
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 border-t pt-3 text-xs text-ai">
        <Sparkles className="mt-px size-3 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">Why you see this:</span> {reason}
        </span>
      </p>
    </article>
  );
}
