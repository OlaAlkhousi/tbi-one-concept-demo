import { documents } from "@/lib/data/catalog";
import { canViewDocument } from "@/lib/permissions";
import { search } from "@/lib/search";
import { myProjects, type S } from "@/lib/selectors";
import { stem, tokens } from "@/lib/ai/text";
import type { KnowledgeDocument } from "@/lib/types";

export type DocCategory = KnowledgeDocument["category"];

export const CATEGORIES: DocCategory[] = ["Reports", "Guidelines", "Onboarding", "Procedures", "Security", "Handbooks", "Strategy", "Learning"];

export interface DocFilter {
  query: string;
  category: DocCategory | "all";
  tag: string | null;
  /** Only documents linked to one of my projects. */
  related: boolean;
}

export interface DocResult {
  doc: KnowledgeDocument;
  /** False = restricted and the user can't read it: show title, category and owner only. */
  readable: boolean;
  /** Heading of the section the query matched in (readable documents only). */
  matchedSection?: string;
}

/**
 * Filters the knowledge base for the current user.
 *
 * The text query goes through the shared permission-aware search, which matches
 * unreadable documents on their title only. Tags and project links of unreadable
 * documents are never shown, so they must never match a filter either.
 */
export function filterDocuments(s: S, f: DocFilter): DocResult[] {
  const mine = new Set(myProjects(s).map((p) => p.id));
  const q = f.query.trim();
  const scores = q ? new Map(search(s, q, Number.MAX_SAFE_INTEGER).filter((r) => r.group === "Documents").map((r) => [r.id, r.score])) : undefined;
  const qStems = q ? tokens(q).map(stem) : [];

  const out: (DocResult & { score: number })[] = [];
  for (const doc of documents) {
    const readable = canViewDocument(s, s.currentUserId, doc);
    if (f.category !== "all" && doc.category !== f.category) continue;
    if (f.tag && !(readable && doc.tags.includes(f.tag))) continue;
    if (f.related && !(readable && doc.projectIds.some((id) => mine.has(id)))) continue;
    const score = scores ? scores.get(doc.id) : 0;
    if (score === undefined) continue;
    const matchedSection = readable && qStems.length ? doc.sections.find((sec) => qStems.some((w) => `${sec.heading} ${sec.body}`.toLowerCase().includes(w)))?.heading : undefined;
    out.push({ doc, readable, matchedSection, score });
  }
  return out
    .sort((a, b) => b.score - a.score || b.doc.updatedAt.localeCompare(a.doc.updatedAt))
    .map(({ doc, readable, matchedSection }) => ({ doc, readable, matchedSection }));
}

/** Result count per category for the current query and filters (ignoring the category itself). */
export function categoryCounts(s: S, f: Omit<DocFilter, "category">): Record<DocCategory | "all", number> {
  const counts = Object.fromEntries([...CATEGORIES, "all"].map((c) => [c, 0])) as Record<DocCategory | "all", number>;
  for (const r of filterDocuments(s, { ...f, category: "all" })) {
    counts[r.doc.category]++;
    counts.all++;
  }
  return counts;
}

/** Most used tags, taken from documents the user can read only. */
export function popularTags(s: S, limit: number): string[] {
  const freq = new Map<string, number>();
  for (const d of documents) {
    if (!canViewDocument(s, s.currentUserId, d)) continue;
    for (const t of d.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}
