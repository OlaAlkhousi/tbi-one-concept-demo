import { employees } from "@/lib/data/people";
import { canViewProject } from "@/lib/permissions";
import type { S } from "@/lib/selectors";
import type { Employee, ID, Project } from "@/lib/types";

/** Projects a person works on, limited to the ones the viewer may see. Restricted ones simply don't appear. */
export function projectsOf(s: S, personId: ID): Project[] {
  return s.projects.filter((p) => (p.teamIds.includes(personId) || p.ownerId === personId) && canViewProject(s, s.currentUserId, p));
}

/** Every word of the query must appear in the person's professional profile. */
export function matchesPerson(e: Employee, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [e.name, e.role, e.department, e.location, e.expertise, ...e.skills, ...e.responsibilities].join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export function popularSkills(limit: number): string[] {
  const freq = new Map<string, number>();
  for (const e of employees) for (const sk of e.skills) freq.set(sk, (freq.get(sk) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([sk]) => sk);
}

/**
 * Question for "Ask assistant about <name>".
 * limit: the demo engine has no "tell me about a person" intent, so this asks who knows the
 * person's main (first listed) skill, which the engine answers with that person (pinned by a
 * test for every colleague). Ask about the person directly once the engine supports it.
 */
export function askAboutPrompt(e: Employee): string {
  return `Tell me about ${e.name}`;
}

export const DEPARTMENTS: string[] = [...new Set(employees.map((e) => e.department))].sort();
