import { mondayOf } from "@/lib/time";
import type { ID, ISODate, LogbookEntry } from "@/lib/types";

export interface LogbookFilters {
  query?: string;
  kind?: LogbookEntry["kind"] | "all";
  projectId?: ID | "all";
}

const searchable = (e: LogbookEntry) => [e.title, e.completed, e.challenges, e.learnings, e.decisions, e.nextSteps].join("\n").toLowerCase();

/** The logbook is private: only the owner's entries, then the search and filters. */
export function visibleLogbook(entries: LogbookEntry[], userId: ID, f: LogbookFilters = {}): LogbookEntry[] {
  const q = f.query?.trim().toLowerCase();
  return entries.filter(
    (e) =>
      e.userId === userId &&
      (!f.kind || f.kind === "all" || e.kind === f.kind) &&
      (!f.projectId || f.projectId === "all" || e.projectIds.includes(f.projectId)) &&
      (!q || searchable(e).includes(q)),
  );
}

/**
 * Groups entries per ISO week, newest week first. Inside a week the weekly report comes
 * first (it summarises the week), then daily entries newest first.
 */
export function groupByWeek(entries: LogbookEntry[]): { monday: ISODate; entries: LogbookEntry[] }[] {
  const groups = new Map<ISODate, LogbookEntry[]>();
  for (const e of entries) {
    const monday = mondayOf(e.date);
    groups.set(monday, [...(groups.get(monday) ?? []), e]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monday, list]) => ({
      monday,
      entries: list.sort(
        (a, b) => Number(b.kind === "weekly") - Number(a.kind === "weekly") || b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      ),
    }));
}
