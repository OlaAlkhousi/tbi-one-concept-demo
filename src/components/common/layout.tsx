import { Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-balance">
          {Icon && (
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A card surface with an optional header row. Used for every dashboard module. */
export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  description,
  id,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  description?: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center", className)}>
      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const body = (
    <div className="group flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-px hover:shadow-lift">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{value}</p>
        {hint && <p className={cn("mt-1 truncate text-xs", tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-muted-foreground")}>{hint}</p>}
      </div>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

export function ProgressBar({ value, className, tone = "primary", label }: { value: number; className?: string; tone?: "primary" | "success" | "warning" | "danger"; label?: string }) {
  const color = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "danger" ? "bg-danger" : "bg-primary";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Marks AI output honestly: in demo mode it is a deterministic simulation, not a language model. */
export function AiBadge({ engine = "demo", className }: { engine?: "demo" | "llm"; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1 rounded-full bg-ai-soft px-2 text-[11px] font-medium text-ai ring-1 ring-ai/20 ring-inset", className)}
      title={engine === "demo" ? "Generated by TBI ONE's local demo engine from workspace data. No language model is used." : "Phrased by the configured language model, grounded in workspace data."}
    >
      <Sparkles className="size-3" aria-hidden />
      {engine === "demo" ? "Simulated AI" : "AI (LLM)"}
    </span>
  );
}

export function KeyHint({ children }: { children: React.ReactNode }) {
  return <kbd className="pointer-events-none inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">{children}</kbd>;
}
