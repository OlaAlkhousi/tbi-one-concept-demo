import { cn } from "@/lib/utils";

/** Toggle chip for filters. Used by Knowledge, People and News. */
export function FilterChip({
  active,
  onClick,
  children,
  count,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-primary/30 bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
      {count !== undefined && <span className="tabular text-[10px] opacity-70">{count}</span>}
    </button>
  );
}

/** Horizontal chip row: scrolls inside itself on phones, wraps from `sm` up. Never scrolls the page. */
export function ChipRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible", className)}>
      {children}
    </div>
  );
}
