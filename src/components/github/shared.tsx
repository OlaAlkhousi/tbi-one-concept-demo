"use client";

import { CircleCheck, CircleDashed, CircleDot, CircleX, FlaskConical, GitMerge, GitPullRequest, GitPullRequestDraft } from "lucide-react";
import { Pill } from "@/components/common/badges";
import { repositories } from "@/lib/data/catalog";
import type { GithubIssue, PullRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = React.ComponentProps<typeof Pill>["tone"];

/** Labels offered as toggle chips when creating an issue. */
export const ISSUE_LABELS = ["bug", "enhancement", "documentation", "accessibility"] as const;

const LABEL_TONE: Record<string, Tone> = {
  bug: "danger",
  blocker: "danger",
  enhancement: "info",
  documentation: "primary",
  accessibility: "ai",
  "good first issue": "success",
  "from-meeting": "warning",
  "from-tbi-one": "primary",
};

export const labelTone = (label: string): Tone => LABEL_TONE[label] ?? "neutral";

export const repoName = (id: string) => repositories.find((r) => r.id === id)?.name ?? id;

export function LabelPill({ label }: { label: string }) {
  return <Pill tone={labelTone(label)}>{label}</Pill>;
}

export function IssueStateIcon({ state, className }: { state: GithubIssue["state"]; className?: string }) {
  const Icon = state === "open" ? CircleDot : CircleCheck;
  return (
    <span className={cn("inline-flex shrink-0", state === "open" ? "text-success" : "text-ai", className)} title={state === "open" ? "Open" : "Closed"}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{state === "open" ? "Open issue" : "Closed issue"}</span>
    </span>
  );
}

const PR_STATE: Record<PullRequest["state"], { icon: typeof GitPullRequest; className: string; label: string }> = {
  open: { icon: GitPullRequest, className: "text-success", label: "Open pull request" },
  draft: { icon: GitPullRequestDraft, className: "text-muted-foreground", label: "Draft pull request" },
  merged: { icon: GitMerge, className: "text-ai", label: "Merged pull request" },
};

export function PrStateIcon({ state, className }: { state: PullRequest["state"]; className?: string }) {
  const meta = PR_STATE[state];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex shrink-0", meta.className, className)} title={meta.label}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

const CHECKS: Record<PullRequest["checks"], { icon: typeof CircleCheck; tone: Tone; label: string }> = {
  passing: { icon: CircleCheck, tone: "success", label: "Checks passing" },
  failing: { icon: CircleX, tone: "danger", label: "Checks failing" },
  pending: { icon: CircleDashed, tone: "warning", label: "Checks pending" },
};

export function ChecksBadge({ checks }: { checks: PullRequest["checks"] }) {
  const meta = CHECKS[checks];
  return (
    <Pill tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Pill>
  );
}

const LANGUAGE_HUE: Record<string, number> = { TypeScript: 250, Python: 95, JavaScript: 100 };

export function LanguageDot({ language }: { language: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: `oklch(0.62 0.14 ${LANGUAGE_HUE[language] ?? 0})` }} aria-hidden />
      {language}
    </span>
  );
}

export function DemoIssueBadge() {
  return (
    <Pill tone="ai" icon={FlaskConical}>
      created in demo
    </Pill>
  );
}

/**
 * Honesty banner. Everything under /github is a local mock; the note explains how
 * a real provider would slot in.
 */
export function SimulatedBanner({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div role="note" className={cn("flex gap-3 rounded-xl border border-info/20 bg-info-soft px-4 py-3", className)} data-testid="github-simulated-banner">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-info">Simulated GitHub workspace — demo data, nothing is sent to github.com</p>
        {!compact && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Architecture note: issues, pull requests and commits come from a local mock provider in this demo. In production, a GitHub App calling the GitHub REST or GraphQL API with each user&apos;s own permissions can replace that provider
            without changing this screen.
          </p>
        )}
      </div>
    </div>
  );
}
