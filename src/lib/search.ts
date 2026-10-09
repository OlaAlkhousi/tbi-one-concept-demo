import { documents, repositories } from "./data/catalog";
import { employees } from "./data/people";
import { canViewDocument, canViewMeeting, canViewProject, canViewRepo } from "./permissions";
import type { S } from "./selectors";
import { formatDate } from "./time";
import { stem, tokens } from "./ai/text";

export type SearchGroup = "Projects" | "People" | "Tasks" | "Meetings" | "Documents" | "GitHub issues" | "Logbook";

export interface SearchResult {
  group: SearchGroup;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  /** Restricted item the user can't open: shown so they can request access, never with content. */
  locked?: boolean;
}

interface Doc {
  group: SearchGroup;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** Searchable fields with weights. Restricted items only expose their title. */
  fields: [string, number][];
  locked?: boolean;
}

function matchScore(qTokens: string[], fields: [string, number][]): number {
  let total = 0;
  for (const q of qTokens) {
    let best = 0;
    for (const [text, weight] of fields) {
      const words = tokens(text).map(stem);
      if (words.some((w) => w === q)) best = Math.max(best, weight * 1.2);
      else if (words.some((w) => w.startsWith(q))) best = Math.max(best, weight);
    }
    if (best === 0) return 0; // every query word must match somewhere
    total += best;
  }
  return total;
}

function buildIndex(s: S): Doc[] {
  const u = s.currentUserId;
  const out: Doc[] = [];
  const pname = (id?: string) => s.projects.find((p) => p.id === id)?.name ?? "";

  for (const p of s.projects) {
    if (canViewProject(s, u, p)) {
      out.push({ group: "Projects", id: p.id, title: p.name, subtitle: `${p.code} · ${p.status.replace("-", " ")}`, href: `/projects/${p.id}`, fields: [[p.name, 3], [p.aliases.join(" "), 2.5], [p.technologies.join(" "), 1.5], [p.description, 1]] });
    } else {
      out.push({ group: "Projects", id: p.id, title: p.name, subtitle: "Restricted — request access", href: `/projects/${p.id}`, fields: [[p.name, 3]], locked: true });
    }
  }
  for (const e of employees) {
    out.push({ group: "People", id: e.id, title: e.name, subtitle: `${e.role} · ${e.department}`, href: `/people?person=${e.id}`, fields: [[e.name, 3], [e.role, 2], [e.skills.join(" "), 2], [e.department, 1], [e.expertise, 1]] });
  }
  for (const t of s.tasks) {
    const visible = t.projectId ? canViewProject(s, u, s.projects.find((p) => p.id === t.projectId)!) : t.assigneeId === u || t.creatorId === u;
    if (!visible) continue;
    out.push({ group: "Tasks", id: t.id, title: t.title, subtitle: `${pname(t.projectId) || "Personal"} · ${t.status.replace("-", " ")}`, href: `/tasks?task=${t.id}`, fields: [[t.title, 3], [t.tags.join(" "), 1.5], [t.description, 1], [pname(t.projectId), 0.8]] });
  }
  for (const m of s.meetings) {
    if (!canViewMeeting(s, u, m)) continue;
    out.push({ group: "Meetings", id: m.id, title: m.title, subtitle: formatDate(m.start, "EEE d MMM, HH:mm"), href: `/calendar/${m.id}`, fields: [[m.title, 3], [m.description, 1], [m.summary ?? "", 1], [pname(m.projectId), 0.8]] });
  }
  for (const d of documents) {
    if (canViewDocument(s, u, d)) {
      out.push({ group: "Documents", id: d.id, title: d.title, subtitle: `${d.category} · updated ${formatDate(d.updatedAt, "d MMM")}`, href: `/knowledge?doc=${d.id}`, fields: [[d.title, 3], [d.tags.join(" "), 2], [d.summary, 1.2], [d.sections.map((x) => x.body).join(" "), 0.6]] });
    } else {
      out.push({ group: "Documents", id: d.id, title: d.title, subtitle: "Restricted — request access", href: `/knowledge?doc=${d.id}`, fields: [[d.title, 3]], locked: true });
    }
  }
  for (const i of s.issues) {
    const repo = repositories.find((r) => r.id === i.repoId);
    if (!repo || !canViewRepo(s, u, repo)) continue;
    out.push({ group: "GitHub issues", id: i.id, title: `#${i.number} ${i.title}`, subtitle: `${repo.name} · ${i.state}`, href: `/github?issue=${i.id}`, fields: [[i.title, 3], [i.labels.join(" "), 1.5], [repo.name.replace(/-/g, " "), 1], [i.body, 0.8]] });
  }
  for (const l of s.logbook.filter((l) => l.userId === u)) {
    out.push({ group: "Logbook", id: l.id, title: l.title, subtitle: `${l.kind} · ${formatDate(l.date, "d MMM")}`, href: `/logbook?entry=${l.id}`, fields: [[l.title, 3], [`${l.completed} ${l.learnings} ${l.nextSteps}`, 1]] });
  }
  return out;
}

export const GROUP_ORDER: SearchGroup[] = ["Projects", "Meetings", "Tasks", "Documents", "GitHub issues", "People", "Logbook"];

export function search(s: S, query: string, perGroup = 5): SearchResult[] {
  const q = tokens(query).map(stem);
  if (q.length === 0) return [];
  const results: SearchResult[] = [];
  for (const d of buildIndex(s)) {
    const score = matchScore(q, d.fields);
    if (score > 0) results.push({ group: d.group, id: d.id, title: d.title, subtitle: d.subtitle, href: d.href, score, locked: d.locked });
  }
  const grouped: SearchResult[] = [];
  for (const g of GROUP_ORDER) {
    grouped.push(...results.filter((r) => r.group === g).sort((a, b) => b.score - a.score).slice(0, perGroup));
  }
  return grouped;
}
