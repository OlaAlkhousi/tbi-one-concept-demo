import { courses, technologySkill } from "../data/catalog";
import type { S } from "../selectors";
import { myProjects } from "../selectors";
import type { Course, ID } from "../types";

export interface LearningRecommendation {
  course: Course;
  skill: string;
  gap: number;
  reason: string;
  projectIds: ID[];
}

export function courseProgress(s: S, courseId: ID, userId = s.currentUserId): number {
  const course = courses.find((c) => c.id === courseId);
  const done = s.learning.find((l) => l.userId === userId)?.completedLessons[courseId]?.length ?? 0;
  return course ? Math.round((done / course.lessons.length) * 100) : 0;
}

/**
 * Recommends courses that close a skill gap *for work the employee is actually doing*:
 * a technology used in one of their projects maps to a skill, and the skill's gap
 * (target − level) decides the order. Every recommendation names the project.
 */
export function learningRecommendations(s: S, userId = s.currentUserId): LearningRecommendation[] {
  const profile = s.learning.find((l) => l.userId === userId);
  if (!profile) return [];
  const projects = myProjects({ ...s, currentUserId: userId });
  const needed = new Map<string, { techs: Set<string>; projectIds: Set<ID> }>();
  for (const p of projects) {
    for (const tech of p.technologies) {
      const skill = technologySkill[tech];
      if (!skill) continue;
      const entry = needed.get(skill) ?? { techs: new Set(), projectIds: new Set() };
      entry.techs.add(tech);
      entry.projectIds.add(p.id);
      needed.set(skill, entry);
    }
  }
  // Tasks mentioning tests count as a need for testing skills.
  if (s.tasks.some((t) => t.assigneeId === userId && t.status !== "done" && /test/i.test(t.title))) {
    const entry = needed.get("Testing") ?? { techs: new Set(["Vitest"]), projectIds: new Set() };
    needed.set("Testing", entry);
  }

  const recs: LearningRecommendation[] = [];
  for (const [skill, { techs, projectIds }] of needed) {
    const level = profile.skills.find((x) => x.skill === skill);
    if (!level) continue;
    const gap = level.target - level.level;
    if (gap < 15) continue;
    const course = courses.find((c) => c.skill === skill && courseProgress(s, c.id, userId) < 100);
    if (!course) continue;
    const pNames = [...projectIds].map((id) => s.projects.find((p) => p.id === id)?.name).filter(Boolean);
    recs.push({
      course,
      skill,
      gap,
      projectIds: [...projectIds],
      reason: `${pNames.length ? `You work on ${pNames.join(" and ")}, which uses ${[...techs].join(", ")}. ` : `Your open tasks involve ${[...techs].join(", ")}. `}Your ${skill} level is ${level.level}/100 against a target of ${level.target}.`,
    });
  }
  return recs.sort((a, b) => b.gap - a.gap).slice(0, 4);
}
