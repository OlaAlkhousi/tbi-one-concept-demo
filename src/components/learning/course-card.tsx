"use client";

import { toast } from "sonner";
import { ChevronDown, Clock, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pill } from "@/components/common/badges";
import { useS } from "@/components/common/hooks";
import { ProgressBar } from "@/components/common/layout";
import { courseProgress } from "@/lib/ai/learning";
import type { Course, LearningProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

const levelLabel: Record<Course["level"], string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export function CourseCard({
  course,
  profile,
  expanded,
  highlighted,
  onToggleExpanded,
  onEnroll,
}: {
  course: Course;
  profile: LearningProfile;
  expanded: boolean;
  highlighted: boolean;
  onToggleExpanded: () => void;
  onEnroll: () => void;
}) {
  const s = useS();
  const toggleLesson = useWorkspace((x) => x.toggleLesson);
  const enrolled = profile.enrolledCourseIds.includes(course.id);
  const doneIds = profile.completedLessons[course.id] ?? [];
  const done = doneIds.length;
  const pct = courseProgress(s, course.id);
  const minutes = course.lessons.reduce((n, l) => n + l.minutes, 0);
  const listId = `lessons-${course.id}`;

  function toggle(lessonId: string) {
    const completesCourse = !doneIds.includes(lessonId) && done === course.lessons.length - 1;
    toggleLesson(course.id, lessonId);
    if (completesCourse) toast.success("Course completed", { description: `You finished ${course.title}.`, icon: <Trophy className="size-4" /> });
  }

  return (
    <article
      id={`course-${course.id}`}
      data-testid="course-card"
      className={cn(
        "scroll-mt-24 flex flex-col rounded-xl border bg-card p-4 shadow-card transition-[box-shadow,border-color] duration-500",
        pct === 100 && "border-success/30",
        highlighted && "border-primary/50 shadow-lift ring-3 ring-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-muted-foreground">{course.provider}</p>
          <h3 className="mt-0.5 text-sm font-semibold text-balance">{course.title}</h3>
        </div>
        {pct === 100 ? (
          <Pill tone="success" icon={Trophy}>
            Completed
          </Pill>
        ) : enrolled ? (
          <Pill tone="info">{done > 0 ? "In progress" : "Enrolled"}</Pill>
        ) : null}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Pill tone="primary">{course.skill}</Pill>
        <Pill>{levelLabel[course.level]}</Pill>
        <Pill icon={Clock}>
          {course.lessons.length} lessons · {minutes} min
        </Pill>
      </div>
      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2">
          <ProgressBar value={pct} tone={pct === 100 ? "success" : "primary"} label={`${course.title} progress`} />
          <span className="w-9 text-right text-xs font-semibold tabular">{pct}%</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" className="-ml-2" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls={listId}>
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide lessons" : `Lessons ${done}/${course.lessons.length}`}
          </Button>
          {!enrolled && (
            <Button size="sm" variant="outline" onClick={onEnroll} data-testid="enroll-course">
              <Plus /> Enroll
            </Button>
          )}
        </div>
        {expanded && (
          <ul id={listId} className="mt-2 divide-y rounded-lg border animate-in fade-in slide-in-from-top-1 duration-200">
            {course.lessons.map((l, i) => {
              const id = `${course.id}-${l.id}`;
              const checked = doneIds.includes(l.id);
              return (
                <li key={l.id}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition hover:bg-muted/50">
                    <Checkbox id={id} checked={checked} onCheckedChange={() => toggle(l.id)} data-testid="lesson-toggle" />
                    <span className={cn("min-w-0 flex-1", checked && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                      <span className="mr-1.5 text-muted-foreground tabular">{i + 1}.</span>
                      {l.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">{l.minutes} min</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
