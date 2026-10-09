"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { myMeetings, visibleMeetings } from "@/lib/selectors";
import { dateOf, formatDate, formatTime } from "@/lib/time";
import type { ID, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { PageHeader } from "@/components/common/layout";
import { AgendaView, MonthView, TimeGrid } from "@/components/calendar/views";
import { hueSwatch, isWeekend, needsActionPlan, rangeFor, rangeLabel, relativeDay, stepAnchor, useNow, type CalendarView } from "@/components/calendar/utils";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "agenda", label: "Agenda" },
];

export default function CalendarPage() {
  const s = useS();
  const today = useToday();
  const now = useNow();
  usePageContext({ kind: "page", label: "Calendar" });

  // Phones start in the agenda: a five-column time grid is too cramped at 375px.
  const [view, setView] = useState<CalendarView>(() => (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "agenda" : "week"));
  const [anchor, setAnchor] = useState(today);
  const [onlyMine, setOnlyMine] = useState(false);

  const meetings = onlyMine ? myMeetings(s) : visibleMeetings(s);
  const projects = useMemo(() => new Map<ID, Project>(s.projects.map((p) => [p.id, p])), [s.projects]);
  const range = rangeFor(view, anchor);
  const inRange = meetings.filter((m) => range.includes(dateOf(m.start)));
  const mineInRange = inRange.filter((m) => m.participantIds.includes(s.currentUserId)).length;
  // Weekend columns only when something is planned on them.
  const weekDays = range.filter((d) => !isWeekend(d) || inRange.some((m) => dateOf(m.start) === d));
  const showsToday = range.includes(today);

  const pending = myMeetings(s).filter((m) => needsActionPlan(m, now));
  const legendProjects = [...new Set(inRange.map((m) => m.projectId).filter(Boolean))].map((id) => projects.get(id!)).filter((p): p is Project => Boolean(p));
  const hasPersonal = inRange.some((m) => !m.projectId);
  const hasOthers = inRange.some((m) => !m.participantIds.includes(s.currentUserId));
  const hasPlans = inRange.some((m) => m.participantIds.includes(s.currentUserId) && needsActionPlan(m, now));

  const pickDay = (d: string) => {
    setAnchor(d);
    setView("day");
  };
  const viewProps = { meetings, projects, userId: s.currentUserId, today, now };

  return (
    <div>
      <PageHeader
        title="Calendar"
        icon={CalendarDays}
        description="Your meetings and the project meetings you can see. Open a meeting for its summary, or to turn its action points into tasks. Times are Amsterdam time."
      />

      {pending.length > 0 && (
        <section className="ai-surface mb-5 overflow-hidden rounded-xl border shadow-card animate-in fade-in slide-in-from-bottom-1" aria-labelledby="pending-plans-title" data-testid="pending-action-plans">
          <div className="flex items-center justify-between gap-2 border-b border-ai/10 px-4 py-2.5">
            <h2 id="pending-plans-title" className="flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="size-4 text-ai" aria-hidden /> Meeting follow-up
            </h2>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Nothing is created until you confirm</span>
          </div>
          <ul className="divide-y divide-ai/10">
            {pending.map((m) => {
              const rel = relativeDay(dateOf(m.start), today);
              return (
                <li key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link href={`/calendar/${m.id}`} className="font-medium underline-offset-4 hover:underline">
                        {m.title}
                      </Link>{" "}
                      <span className="text-muted-foreground">
                        has {m.actionPoints!.length} action point{m.actionPoints!.length === 1 ? "" : "s"} that aren&apos;t tasks yet.
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {rel ?? formatDate(m.start, "EEE d MMM")} · {formatTime(m.start)}–{formatTime(m.end)} · summary from the meeting transcription (simulated)
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0 self-start bg-gradient-to-r from-primary to-[oklch(0.52_0.2_292)] text-primary-foreground sm:self-auto">
                    <Link href={`/calendar/${m.id}?plan=1`}>
                      <Sparkles /> Generate action plan
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card shadow-card" aria-label="Calendar">
        <div className="flex flex-col gap-3 border-b px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setAnchor(stepAnchor(view, anchor, -1))} aria-label={`Previous ${view === "agenda" ? "two weeks" : view}`}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(today)} disabled={view === "day" ? anchor === today : showsToday}>
                Today
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setAnchor(stepAnchor(view, anchor, 1))} aria-label={`Next ${view === "agenda" ? "two weeks" : view}`}>
                <ChevronRight />
              </Button>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tabular" aria-live="polite">
                {rangeLabel(view, anchor)}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {view === "week" && `Week ${formatDate(range[0], "I")} · `}
                {inRange.length} meeting{inRange.length === 1 ? "" : "s"}
                {!onlyMine && inRange.length > 0 && ` · ${mineInRange} with you`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} data-testid="only-my-meetings" />
              <Label htmlFor="only-mine" className="text-xs font-medium text-muted-foreground">
                Only my meetings
              </Label>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <TabsList aria-label="Calendar view">
                {VIEWS.map((v) => (
                  <TabsTrigger key={v.id} value={v.id} className="px-2.5 text-xs" data-testid={`view-${v.id}`}>
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div key={`${view}-${range[0]}`} className="animate-in fade-in duration-200">
          {view === "week" && <TimeGrid days={weekDays} onPickDay={pickDay} {...viewProps} />}
          {view === "day" && <TimeGrid days={range} detailed {...viewProps} />}
          {view === "month" && <MonthView days={range} month={anchor.slice(0, 7)} onPickDay={pickDay} {...viewProps} />}
          {view === "agenda" && <AgendaView days={range} {...viewProps} />}
        </div>

        {(legendProjects.length > 0 || hasPersonal || hasOthers || hasPlans) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3 text-[11px] text-muted-foreground" aria-label="Legend">
            {legendProjects.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={hueSwatch(p.hue)} aria-hidden />
                {p.name}
              </span>
            ))}
            {hasPersonal && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full opacity-50" style={hueSwatch(undefined)} aria-hidden />
                No project
              </span>
            )}
            {hasOthers && (
              <span className={cn("inline-flex items-center gap-1.5")}>
                <Eye className="size-3" aria-hidden />
                Dashed: project meeting you can see but aren&apos;t invited to
              </span>
            )}
            {hasPlans && (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-ai-soft text-ai">
                  <Wand2 className="size-2.5" aria-hidden />
                </span>
                Action points not turned into tasks yet
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
