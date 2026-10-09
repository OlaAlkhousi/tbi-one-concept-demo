"use client";

import { cn } from "@/lib/utils";

/** Pressed-button group for filters and view toggles (Projects and GitHub). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap items-center gap-0.5 self-start rounded-lg bg-muted p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === o.value && "bg-background text-foreground shadow-sm dark:bg-input/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
