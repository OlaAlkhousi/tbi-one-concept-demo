import { Award, BookOpenCheck, Flame, Footprints, Layers, ShieldCheck, type LucideIcon } from "lucide-react";
import { courseProgress } from "@/lib/ai/learning";
import { courses } from "@/lib/data/catalog";
import { learningProfile, type S } from "@/lib/selectors";
import { dateOf, mondayOf, weekDates } from "@/lib/time";
import type { ID, ISODate } from "@/lib/types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress: { value: number; max: number };
}

const lessonsDone = (s: S, courseId: ID) => learningProfile(s)?.completedLessons[courseId]?.length ?? 0;
const lessonCount = (courseId: ID) => courses.find((c) => c.id === courseId)?.lessons.length ?? 0;

/**
 * Lesson completions this week, read from the activity log. The log records completions,
 * so un-ticking a lesson later does not lower the count.
 */
export function lessonsThisWeek(s: S, today: ISODate): number {
  const days = new Set(weekDates(mondayOf(today)));
  return s.activity.filter((a) => a.actorId === s.currentUserId && a.source === "learning" && days.has(dateOf(a.at))).length;
}

/** Badges derived from the learning profile. Nothing is stored: they follow the data. */
export function achievements(s: S, today: ISODate): Achievement[] {
  const profile = learningProfile(s);
  const totalLessons = Object.entries(profile?.completedLessons ?? {}).reduce((n, [cid, ids]) => n + (lessonCount(cid) ? ids.length : 0), 0);
  const coursesDone = courses.filter((c) => courseProgress(s, c.id) === 100).length;
  const week = lessonsThisWeek(s, today);
  const goals = profile?.goals.filter((g) => g.done).length ?? 0;
  const fullStack = ["c-ts", "c-next"];
  const fsDone = fullStack.reduce((n, id) => n + lessonsDone(s, id), 0);
  const fsTotal = fullStack.reduce((n, id) => n + lessonCount(id), 0);

  const make = (a: Omit<Achievement, "unlocked">): Achievement => ({ ...a, unlocked: a.progress.value >= a.progress.max, progress: { ...a.progress, value: Math.min(a.progress.value, a.progress.max) } });
  return [
    make({ id: "first-lesson", title: "First steps", description: "Complete your first lesson.", icon: Footprints, progress: { value: totalLessons, max: 1 } }),
    make({ id: "first-course", title: "First course completed", description: "Finish every lesson of one course.", icon: BookOpenCheck, progress: { value: coursesDone, max: 1 } }),
    make({ id: "week5", title: "5 lessons this week", description: "Complete five lessons in one week.", icon: Flame, progress: { value: week, max: 5 } }),
    make({ id: "goal", title: "Goal reached", description: "Mark one of your learning goals as done.", icon: Award, progress: { value: goals, max: 1 } }),
    make({ id: "security", title: "Security aware", description: "Complete Security Awareness Essentials.", icon: ShieldCheck, progress: { value: lessonsDone(s, "c-security"), max: lessonCount("c-security") } }),
    make({ id: "full-stack", title: "Full-stack foundations", description: "Complete the TypeScript and Next.js courses.", icon: Layers, progress: { value: fsDone, max: fsTotal } }),
  ];
}
