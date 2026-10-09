import type { S } from "../selectors";
import { overdueTasks } from "../selectors";
import { canViewProject } from "../permissions";
import { toISODate } from "../time";
import type { ID, Priority, Project } from "../types";
import { includesAny, list, plural, stems } from "./text";

/**
 * "What improvements do you recommend for this project?"
 *
 * Rule-based and evidence-first: each recommendation is produced by a rule that
 * looks at real project records (objectives, features, tasks, risks, decisions,
 * issues, other projects) and lists those records as evidence. No rule fires
 * without evidence, so the suggestions are explainable and checkable.
 */

export interface Evidence {
  kind: "objective" | "risk" | "task" | "issue" | "decision" | "project" | "feature" | "meeting";
  label: string;
  href?: string;
}

export interface Insight {
  id: ID;
  title: string;
  why: string;
  impact: "high" | "medium" | "low";
  effort: "small" | "medium" | "large";
  evidence: Evidence[];
  task: { title: string; description: string; priority: Priority };
}

const USER_FACING = ["Next.js", "React", "Figma"];

function coveredBy(objective: string, texts: string[]): boolean {
  const key = [...stems(objective)].filter((w) => w.length > 4);
  // Prefix match so "confirm" covers "confirmation" and "reserve" covers "reservation".
  const same = (a: string, b: string) => a.slice(0, 6) === b.slice(0, 6);
  return texts.some((t) => {
    const ts = [...stems(t)];
    return key.filter((k) => ts.some((w) => same(k, w))).length >= 2;
  });
}

export function projectInsights(s: S, projectId: ID, today = toISODate()): Insight[] {
  const p = s.projects.find((x) => x.id === projectId);
  if (!p) return [];
  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const issues = s.issues.filter((i) => p.repoIds.includes(i.repoId));
  const openIssues = issues.filter((i) => i.state === "open");
  const workTexts = [...p.features, ...tasks.map((t) => `${t.title} ${t.description}`), ...issues.map((i) => i.title)];
  const out: Insight[] = [];

  // 1. Blocking risks without an owner task
  for (const r of p.risks.filter((r) => r.severity === "high" || r.isBlocker)) {
    const related = openTasks.filter((t) => coveredBy(r.title, [`${t.title} ${t.description}`]));
    out.push({
      id: `ins-${p.id}-risk-${r.id}`,
      title: related.length ? `Resolve “${r.title}” before adding new features` : `Create an owner task for “${r.title}”`,
      why: related.length
        ? `This ${r.severity}-severity risk${r.isBlocker ? " is marked as a blocker and" : ""} still has ${plural(related.length, "open task")}. Finishing it first protects the next milestone.`
        : `This ${r.severity}-severity risk has no task, so nobody owns the fix.`,
      impact: "high",
      effort: "medium",
      evidence: [{ kind: "risk", label: `${r.title} (${r.severity})` }, ...related.map((t) => ({ kind: "task" as const, label: t.title, href: `/tasks?task=${t.id}` }))],
      task: { title: related.length ? `Unblock: ${r.title}` : `Mitigate risk: ${r.title}`, description: `${r.mitigation ?? "Agree on a mitigation and owner."}\n\nSource: project risk register.`, priority: "high" },
    });
  }

  // 2. Objectives not covered by any feature, task or issue
  // Only the first uncovered objective, to keep the list focused.
  for (const o of p.objectives.filter((o) => !coveredBy(o, workTexts)).slice(0, 1)) {
    {
      out.push({
        id: `ins-${p.id}-obj-${o.slice(0, 12)}`,
        title: `Plan work for the objective “${o}”`,
        why: "This objective is not covered by any existing feature, task or issue, so it is likely to slip.",
        impact: "high",
        effort: "medium",
        evidence: [{ kind: "objective", label: o }, { kind: "feature", label: `Current features: ${list(p.features)}` }],
        task: { title: `Define first step for: ${o}`, description: `Break this objective into concrete work.\n\nObjective: ${o}`, priority: "medium" },
      });
    }
  }

  // 3. Reuse from other projects (cross-project knowledge discovery)
  for (const other of s.projects.filter((x) => x.id !== p.id && x.visibility === "internal")) {
    for (const f of other.features) {
      const fWords = [...stems(f)].filter((w) => w.length > 5);
      const needed = [...p.objectives, ...openTasks.map((t) => t.title), ...p.decisions.map((d) => d.title)].some((t) => fWords.some((w) => stems(t).has(w)));
      const alreadyHave = p.features.some((pf) => fWords.some((w) => stems(pf).has(w)));
      if (needed && !alreadyHave && !out.some((i) => i.id.startsWith(`ins-${p.id}-reuse-${other.id}`))) {
        out.push({
          id: `ins-${p.id}-reuse-${other.id}-${f.slice(0, 10)}`,
          title: `Reuse “${f}” from ${other.name}`,
          why: `${other.name} already built this. Reusing it saves build and maintenance time and keeps behaviour consistent across internal apps.`,
          impact: "medium",
          effort: "small",
          evidence: [
            { kind: "project", label: `${other.name}: ${f}`, href: `/projects/${other.id}` },
            ...p.decisions.filter((d) => fWords.some((w) => stems(d.title).has(w))).map((d) => ({ kind: "decision" as const, label: d.title })),
          ],
          task: { title: `Investigate reusing ${f} from ${other.name}`, description: `Talk to the ${other.name} team about reusing “${f}”.`, priority: "medium" },
        });
      }
    }
  }

  // 4. Overdue work
  const overdue = overdueTasks(s, p.id, today);
  if (overdue.length) {
    out.push({
      id: `ins-${p.id}-overdue`,
      title: `Re-plan ${plural(overdue.length, "overdue task")}`,
      why: "Overdue tasks make the progress figure unreliable and usually hide a blocker.",
      impact: "medium",
      effort: "small",
      evidence: overdue.map((t) => ({ kind: "task", label: `${t.title} (due ${t.due})`, href: `/tasks?task=${t.id}` })),
      task: { title: `Re-plan overdue work in ${p.name}`, description: overdue.map((t) => `- ${t.title}`).join("\n"), priority: "medium" },
    });
  }

  // 5. Open decisions
  for (const d of p.decisions.filter((d) => d.status === "open")) {
    out.push({
      id: `ins-${p.id}-dec-${d.id}`,
      title: `Take the open decision: “${d.title}”`,
      why: `${d.rationale} Open decisions block dependent work.`,
      impact: "medium",
      effort: "small",
      evidence: [{ kind: "decision", label: d.title, href: d.meetingId ? `/calendar/${d.meetingId}` : undefined }],
      task: { title: `Decide: ${d.title}`, description: "Prepare options and get a decision from the owner.", priority: "high" },
    });
  }

  // 6. Bug load
  const bugs = openIssues.filter((i) => i.labels.includes("bug"));
  if (bugs.length >= 2) {
    out.push({
      id: `ins-${p.id}-bugs`,
      title: "Stabilise before the next milestone",
      why: `${plural(bugs.length, "open bug")} in the repository. Users in a pilot judge quality quickly.`,
      impact: "high",
      effort: "medium",
      evidence: bugs.map((b) => ({ kind: "issue", label: `#${b.number} ${b.title}`, href: `/github?issue=${b.id}` })),
      task: { title: `Bug-fix session for ${p.name}`, description: bugs.map((b) => `- #${b.number} ${b.title}`).join("\n"), priority: "high" },
    });
  }

  // 7. Missing tests
  const mentionsTests = workTexts.some((t) => includesAny(t, ["test"]));
  if (!mentionsTests && p.technologies.some((t) => ["Next.js", "TypeScript", "Python"].includes(t))) {
    out.push({
      id: `ins-${p.id}-tests`,
      title: "Add automated tests for the critical flow",
      why: "No task or issue mentions tests. One end-to-end test for the main user flow catches regressions before a pilot.",
      impact: "medium",
      effort: "small",
      evidence: [{ kind: "feature", label: `Main features: ${list(p.features)}` }],
      task: { title: `Add an end-to-end test for the main flow of ${p.name}`, description: "Use Playwright for the main user journey; Vitest for business rules.", priority: "medium" },
    });
  }

  // 8. Accessibility for user-facing apps
  if (p.technologies.some((t) => USER_FACING.includes(t)) && !workTexts.some((t) => includesAny(t, ["accessib", "keyboard", "wcag"]))) {
    out.push({
      id: `ins-${p.id}-a11y`,
      title: "Check keyboard and screen-reader accessibility",
      why: "This is a user-facing application and no work item covers accessibility yet.",
      impact: "medium",
      effort: "small",
      evidence: [{ kind: "feature", label: `Technologies: ${list(p.technologies)}` }],
      task: { title: `Accessibility check for ${p.name}`, description: "Check keyboard navigation, focus styles, labels and contrast (WCAG 2.2 AA).", priority: "low" },
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.impact] - rank[b.impact]).slice(0, 6);
}

/** Other projects with overlapping technology — only those the current user may see. */
export function similarProjects(s: S, project: Project): { project: Project; shared: string[] }[] {
  return s.projects
    .filter((p) => p.id !== project.id && canViewProject(s, s.currentUserId, p))
    .map((p) => ({ project: p, shared: p.technologies.filter((t) => project.technologies.includes(t)) }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length);
}
