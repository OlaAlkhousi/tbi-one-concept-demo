"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Award, BookOpen, CalendarDays, Check, GraduationCap, Lock, Play, Route, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill } from "@/components/common/badges";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { AiBadge, EmptyState, PageHeader, Panel, ProgressBar, StatCard } from "@/components/common/layout";
import { courseProgress, learningRecommendations } from "@/lib/ai/learning";
import { plural } from "@/lib/ai/text";
import { courses } from "@/lib/data/catalog";
import { learningProfile } from "@/lib/selectors";
import { formatDate, relativeDue } from "@/lib/time";
import type { ID, LearningProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { achievements, lessonsThisWeek } from "./achievements";
import { CourseCard } from "./course-card";

/** Display order of the intern skill set; other skills follow in profile order. */
const SKILL_ORDER = ["TypeScript", "Next.js", "Git & GitHub", "Databases", "API development", "Microsoft Azure", "AI development", "RAG", "Agents & tool calling", "Authentication", "Cybersecurity", "Testing", "CI/CD"];
const orderOf = (skill: string) => (SKILL_ORDER.includes(skill) ? SKILL_ORDER.indexOf(skill) : SKILL_ORDER.length);

function Skills({ profile, recommendedSkills }: { profile: LearningProfile; recommendedSkills: Set<string> }) {
  const skills = [...profile.skills].sort((a, b) => orderOf(a.skill) - orderOf(b.skill));
  return (
    <Panel
      title="Skills"
      icon={TrendingUp}
      description="Your level against the target agreed with your supervisor"
      action={
        <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-primary" /> Level
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-foreground/60" /> Target
          </span>
        </div>
      }
    >
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No skills tracked yet.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2" data-testid="skills-list">
          {skills.map((sk) => {
            const gap = Math.max(0, sk.target - sk.level);
            return (
              <li key={sk.skill} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    <span className="truncate">{sk.skill}</span>
                    {recommendedSkills.has(sk.skill) && <Sparkles className="size-3 shrink-0 text-ai" aria-label="A course is recommended for this skill" />}
                  </span>
                  <span className="shrink-0 tabular">
                    {sk.level}
                    <span className="text-muted-foreground"> / {sk.target}</span>
                    {gap > 0 && <span className={cn("ml-1.5", gap >= 30 ? "text-warning" : "text-muted-foreground")}>−{gap}</span>}
                  </span>
                </div>
                <div className="relative mt-1.5 h-2 rounded-full bg-muted" role="img" aria-label={`${sk.skill}: level ${sk.level} of 100, target ${sk.target}`}>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary/15" style={{ width: `${sk.target}%` }} />
                  <div className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700", sk.level >= sk.target ? "bg-success" : "bg-primary")} style={{ width: `${sk.level}%` }} />
                  <div className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground/60" style={{ left: `calc(${sk.target}% - 1px)` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Roadmap({ profile, today }: { profile: LearningProfile; today: string }) {
  const toggleGoal = useWorkspace((x) => x.toggleGoal);
  const goals = [...profile.goals].sort((a, b) => a.due.localeCompare(b.due));
  const done = goals.filter((g) => g.done).length;
  return (
    <Panel title="Learning roadmap" icon={Route} description={goals.length ? `${done} of ${goals.length} goals reached` : undefined}>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No learning goals yet. Agree on a few with your supervisor.</p>
      ) : (
        <ol className="relative">
          {goals.map((g, i) => {
            const due = relativeDue(g.due, today);
            return (
              <li key={g.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < goals.length - 1 && <span className={cn("absolute top-7 bottom-1 left-[11px] w-px", g.done ? "bg-success/40" : "bg-border")} aria-hidden />}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={g.done}
                  aria-label={g.title}
                  data-testid="goal-toggle"
                  onClick={() => {
                    toggleGoal(g.id);
                    if (!g.done) toast.success("Goal reached", { description: g.title });
                  }}
                  className={cn(
                    "relative z-10 mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-card transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    g.done ? "border-success bg-success text-background" : "border-muted-foreground/35 hover:border-primary",
                  )}
                >
                  {g.done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </button>
                <div className="min-w-0">
                  <p className={cn("text-sm leading-snug", g.done && "text-muted-foreground line-through decoration-muted-foreground/50")}>{g.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3" aria-hidden />
                    {formatDate(g.due, "d MMM yyyy")}
                    {g.done ? (
                      <Pill tone="success">Done</Pill>
                    ) : (
                      // "Due 6 Nov" would repeat the date; only near or overdue goals get a relative label.
                      !/^Due \d/.test(due.label) && <span className={cn(due.tone === "overdue" && "text-danger", due.tone === "soon" && "text-warning")}>· {due.label}</span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export function LearningView() {
  const s = useS();
  const today = useToday();
  const params = useSearchParams();
  const enroll = useWorkspace((x) => x.enroll);
  usePageContext({ kind: "page", label: "Learning" });

  const profile = learningProfile(s);
  const [tab, setTab] = useState<"mine" | "catalogue">("mine");
  const [expanded, setExpanded] = useState<ID[]>([]);
  const [focusId, setFocusId] = useState<ID | null>(null);

  const reveal = (courseId: ID, inMine: boolean) => {
    setTab(inMine ? "mine" : "catalogue");
    setExpanded((x) => (x.includes(courseId) ? x : [...x, courseId]));
    setFocusId(courseId);
  };

  // ?course=<id> (assistant, search) opens that course.
  const courseParam = params.get("course");
  const [seenCourse, setSeenCourse] = useState<string | null>(null);
  if (courseParam !== seenCourse) {
    setSeenCourse(courseParam);
    if (courseParam && courses.some((c) => c.id === courseParam)) reveal(courseParam, Boolean(profile?.enrolledCourseIds.includes(courseParam)));
  }

  useEffect(() => {
    if (!focusId) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`course-${focusId}`)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    const t = setTimeout(() => setFocusId(null), 2600);
    return () => clearTimeout(t);
  }, [focusId]);

  const header = <PageHeader title="Learning & Development" icon={GraduationCap} description="Your skills, goals and courses, linked to the work you are doing." />;

  if (!profile) {
    return (
      <div>
        {header}
        <EmptyState icon={GraduationCap} title="No learning profile yet" description="Learning & Development sets up a profile with your skills and goals. Ask Noor Hendriks to get started." />
      </div>
    );
  }

  const recs = learningRecommendations(s);
  const enrolled = profile.enrolledCourseIds.map((id) => courses.find((c) => c.id === id)).filter((c) => c !== undefined);
  const progress = enrolled.map((c) => courseProgress(s, c.id));
  const inProgress = progress.filter((p) => p > 0 && p < 100).length;
  const completedCourses = courses.filter((c) => courseProgress(s, c.id) === 100).length;
  const lessonsDone = Object.entries(profile.completedLessons).reduce((n, [cid, ids]) => n + (courses.some((c) => c.id === cid) ? ids.length : 0), 0);
  const thisWeek = lessonsThisWeek(s, today);
  const goalsDone = profile.goals.filter((g) => g.done).length;
  const nextGoal = profile.goals.filter((g) => !g.done).sort((a, b) => a.due.localeCompare(b.due))[0];
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const avgLevel = avg(profile.skills.map((x) => x.level));
  const avgTarget = avg(profile.skills.map((x) => x.target));
  const badges = achievements(s, today);
  const unlocked = badges.filter((b) => b.unlocked).length;
  const catalogue = [...courses].sort((a, b) => Number(profile.enrolledCourseIds.includes(a.id)) - Number(profile.enrolledCourseIds.includes(b.id)));

  const card = (c: (typeof courses)[number]) => (
    <CourseCard
      key={c.id}
      course={c}
      profile={profile}
      expanded={expanded.includes(c.id)}
      highlighted={focusId === c.id}
      onToggleExpanded={() => setExpanded((x) => (x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id]))}
      onEnroll={() => {
        enroll(c.id);
        toast.success("Enrolled", { description: c.title });
        reveal(c.id, true);
      }}
    />
  );

  return (
    <div className="space-y-6">
      {header}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Learning at a glance">
        <StatCard label="Courses in progress" value={inProgress} hint={`${completedCourses} completed`} icon={BookOpen} />
        <StatCard label="Lessons completed" value={lessonsDone} hint={thisWeek ? `${thisWeek} this week` : "None yet this week"} icon={Check} tone={thisWeek ? "success" : "default"} />
        <StatCard label="Goals reached" value={`${goalsDone}/${profile.goals.length}`} hint={nextGoal ? `Next: ${relativeDue(nextGoal.due, today).label}` : "All goals reached"} icon={Target} />
        <StatCard
          label="Average skill vs target"
          value={
            <>
              {avgLevel}
              <span className="text-base font-normal text-muted-foreground"> / {avgTarget}</span>
            </>
          }
          hint={plural(profile.skills.length, "skill")}
          icon={TrendingUp}
        />
      </section>

      <section className="ai-surface overflow-hidden rounded-xl border shadow-card" aria-labelledby="recs-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ai/10 px-4 py-3">
          <h2 id="recs-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-ai" aria-hidden /> Recommended for your work
          </h2>
          <AiBadge />
        </div>
        <div className="p-4">
          {recs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your skills match the work you are assigned to. Browse the catalogue for new topics.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recs.map((r) => {
                const isEnrolled = profile.enrolledCourseIds.includes(r.course.id);
                return (
                  <article key={r.course.id} className="flex flex-col rounded-lg border bg-card/80 p-3.5" data-testid="learning-rec">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="ai">{r.skill}</Pill>
                      <span className="text-[11px] text-warning">gap {r.gap} points</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-balance">{r.course.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{r.course.provider}</p>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/80">{r.reason}</p>
                    {r.projectIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.projectIds.map((pid) => (
                          <Link key={pid} href={`/projects/${pid}`} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground">
                            {s.projects.find((p) => p.id === pid)?.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-3">
                      <Button
                        size="sm"
                        variant={isEnrolled ? "outline" : "default"}
                        className={cn(isEnrolled && "bg-card/70")}
                        data-testid="start-course"
                        onClick={() => {
                          if (!isEnrolled) {
                            enroll(r.course.id);
                            toast.success("Course started", { description: r.course.title });
                          }
                          reveal(r.course.id, true);
                        }}
                      >
                        <Play /> {isEnrolled ? `Continue · ${courseProgress(s, r.course.id)}%` : "Start course"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Based on the technologies in your projects and your skill gaps. You decide what to follow.</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skills profile={profile} recommendedSkills={new Set(recs.map((r) => r.skill))} />
        <Roadmap profile={profile} today={today} />
      </div>

      <section aria-labelledby="courses-heading">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "catalogue")} className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="courses-heading" className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden /> Courses
            </h2>
            <TabsList>
              <TabsTrigger value="mine" className="px-3">
                My courses <span className="text-muted-foreground tabular">{enrolled.length}</span>
              </TabsTrigger>
              <TabsTrigger value="catalogue" className="px-3">
                Catalogue <span className="text-muted-foreground tabular">{courses.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="mine">
            {enrolled.length === 0 ? (
              <EmptyState icon={BookOpen} title="No courses yet" description="Start a recommended course or pick one from the catalogue." action={<Button size="sm" variant="outline" onClick={() => setTab("catalogue")}>Open catalogue</Button>} />
            ) : (
              <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">{enrolled.map(card)}</div>
            )}
          </TabsContent>
          <TabsContent value="catalogue">
            <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">{catalogue.map(card)}</div>
          </TabsContent>
        </Tabs>
      </section>

      <Panel title="Achievements" icon={Award} description={`${unlocked} of ${badges.length} unlocked`}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {badges.map((b) => (
            <li key={b.id} className={cn("flex flex-col items-center rounded-xl border p-3 text-center", b.unlocked ? "bg-card" : "bg-muted/30")} data-testid="achievement" data-unlocked={b.unlocked}>
              <span className={cn("relative inline-flex size-11 items-center justify-center rounded-full", b.unlocked ? "bg-success-soft text-success ring-1 ring-success/25" : "bg-muted text-muted-foreground/60")}>
                <b.icon className="size-5" aria-hidden />
                {!b.unlocked && (
                  <span className="absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full bg-card ring-1 ring-border">
                    <Lock className="size-2.5" aria-hidden />
                  </span>
                )}
              </span>
              <p className={cn("mt-2 text-xs font-semibold", !b.unlocked && "text-muted-foreground")}>{b.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{b.description}</p>
              {!b.unlocked && b.progress.max > 1 && (
                <div className="mt-2 flex w-full items-center gap-1.5">
                  <ProgressBar value={(b.progress.value / b.progress.max) * 100} label={`${b.title} progress`} />
                  <span className="text-[10px] text-muted-foreground tabular">
                    {b.progress.value}/{b.progress.max}
                  </span>
                </div>
              )}
              <span className="sr-only">{b.unlocked ? "Unlocked" : "Locked"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
