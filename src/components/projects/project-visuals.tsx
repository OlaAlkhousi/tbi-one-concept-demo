import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Coloured accent from the project's hue, used as the top bar on cards and the detail header. */
export const accentStyle = (hue: number): React.CSSProperties => ({
  background: `linear-gradient(90deg, oklch(0.62 0.14 ${hue}), oklch(0.56 0.16 ${(hue + 40) % 360}))`,
});

export function progressTone(status: Project["status"]): "primary" | "success" | "warning" | "danger" {
  return status === "blocked" ? "danger" : status === "at-risk" ? "warning" : status === "completed" ? "success" : "primary";
}

/** Small square with the project code, tinted by the project hue in both themes. */
export function ProjectMonogram({ project, className }: { project: Pick<Project, "code" | "hue">; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold tracking-wide",
        "bg-[oklch(0.62_0.13_var(--hue)/0.12)] text-[oklch(0.45_0.14_var(--hue))] dark:bg-[oklch(0.62_0.13_var(--hue)/0.2)] dark:text-[oklch(0.82_0.1_var(--hue))]",
        className,
      )}
      style={{ "--hue": project.hue } as React.CSSProperties}
      aria-hidden
    >
      {project.code}
    </span>
  );
}

const ringColor = { primary: "text-primary", success: "text-success", warning: "text-warning", danger: "text-danger" };

export function ProgressRing({ value, size = 72, stroke = 7, tone = "primary", label }: { value: number; size?: number; stroke?: number; tone?: keyof typeof ringColor; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", ringColor[tone])}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular" aria-hidden>
        {pct}%
      </span>
    </div>
  );
}
