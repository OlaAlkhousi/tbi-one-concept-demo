"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FILTER_META, INBOX_FILTERS, type InboxFilter } from "./inbox-utils";

/**
 * One set of filter buttons for every width: a scrollable chip row in narrow layouts,
 * a vertical rail once the inbox container is wide enough for three panes.
 */
export function FilterNav({ active, counts, onChange, className }: { active: InboxFilter; counts: Record<InboxFilter, number>; onChange: (f: InboxFilter) => void; className?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);

  // In the chip row, keep the active filter in view (e.g. when opened with ?filter=action).
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-testid="filter-${active}"]`);
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    if (c.left < r.left || c.right > r.right) row.scrollLeft += c.left - r.left - 8;
  }, [active]);

  return (
    <nav aria-label="Inbox filters" className={cn("flex min-w-0 flex-col border-b @5xl/inbox:border-r @5xl/inbox:border-b-0", className)}>
      <div ref={rowRef} className="flex gap-1 overflow-x-auto p-2 @5xl/inbox:flex-col @5xl/inbox:overflow-visible @5xl/inbox:p-3">
        {INBOX_FILTERS.map((f) => {
          const meta = FILTER_META[f];
          const Icon = meta.icon;
          const on = f === active;
          const count = counts[f];
          return (
            <button
              key={f}
              type="button"
              data-testid={`filter-${f}`}
              aria-pressed={on}
              onClick={() => onChange(f)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 @5xl/inbox:w-full",
                on ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{meta.label}</span>
              {count > 0 && (
                <span className={cn("ml-auto rounded-full px-1.5 text-[11px] font-medium tabular", on ? "bg-primary/10" : "bg-muted text-muted-foreground")}>
                  {count}
                  <span className="sr-only"> messages</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-auto hidden px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground @5xl/inbox:block">
        Teams, Outlook and GitHub items here are simulated. Replies are saved in this demo and never sent.
      </p>
    </nav>
  );
}
