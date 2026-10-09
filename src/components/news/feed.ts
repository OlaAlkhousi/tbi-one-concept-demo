import { canViewProjectId } from "@/lib/permissions";
import { me, myProjects, type S } from "@/lib/selectors";
import type { NewsCategory, NewsItem, PersonaKind } from "@/lib/types";

export const personaNoun: Record<PersonaKind, [string, string]> = {
  intern: ["intern", "interns"],
  developer: ["developer", "developers"],
  lead: ["team lead", "team leads"],
  pm: ["project manager", "project managers"],
};

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  announcement: "Announcements",
  innovation: "Innovation",
  project: "Projects",
  learning: "Learning",
  ai: "AI",
  event: "Events",
};

export interface NewsRelevance {
  /** 0 = not aimed at this user; higher = more relevant. */
  score: number;
  /** Plain-language explanation for the "Why you see this" line. */
  reason: string;
}

function joinWords(words: string[]): string {
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** Why an item is (or isn't) in this user's feed. Own projects weigh most, then role, then company-wide. */
export function newsRelevance(s: S, item: NewsItem): NewsRelevance {
  const persona = me(s).persona;
  const project = item.projectId ? myProjects(s).find((p) => p.id === item.projectId) : undefined;
  if (project) return { score: 3, reason: `About your project ${project.name}` };
  if (persona && item.audience.includes(persona)) return { score: 2, reason: `Relevant to your role as ${personaNoun[persona][0]}` };
  if (item.audience.length === 0) return { score: 1, reason: "Company-wide news for everyone" };
  return { score: 0, reason: `Shared with ${joinWords(item.audience.map((a) => personaNoun[a][1]))}` };
}

/** Every item the user may see, newest first. */
export function allNews(s: S): NewsItem[] {
  return s.news.filter((n) => canViewProjectId(s, s.currentUserId, n.projectId)).sort((a, b) => b.date.localeCompare(a.date));
}

/** Items aimed at this user's role, company-wide items and news about their projects; most relevant first. */
export function forYou(s: S): NewsItem[] {
  return allNews(s)
    .map((n) => ({ n, score: newsRelevance(s, n).score }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.n.date.localeCompare(a.n.date))
    .map((x) => x.n);
}
