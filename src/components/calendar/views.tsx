"use client";

import Link from "next/link";
import { CalendarDays, Eye, MapPin, Wand2 } from "lucide-react";
import { dateOf, formatDate, formatTime } from "@/lib/time";
import type { ID, ISODate, Meeting, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/layout";
import { Pill } from "@/components/common/badges";
import { AvatarStack } from "@/components/common/person-avatar";
import { barClass, borderToneClass, isWeekend, layoutDay, meetingPhase, meetingTone, minutesOf, needsActionPlan, relativeDay, toneClass } from "./utils";

export interface ViewProps {
  meetings: Meeting[];
  projects: Map<ID, Project>;
  userId: ID;
  today: ISODate;
  now: Date;
}

const HOUR = 56; // px per hour in the time grid
const GUTTER = "3.25rem";

const timeRange = (m: Meeting) => `${formatTime(m.start)}–${formatTime(m.end)}`;

function meetingLabel(m: Meeting, project?: Project) {
  return `${m.title}, ${formatDate(m.start, "EEEE d MMMM")} ${timeRange(m)}${project ? `, ${project.name}` : ""}`;
}

/** Small "Action plan" marker for finished meetings whose action points are not tasks yet. */
export function ActionPlanBadge({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-ai-soft text-ai ring-1 ring-ai/20 ring-inset" title="Action points not turned into tasks yet">
      <Wand2 className="size-2.5" aria-hidden />
      <span className="sr-only">Action plan not created yet</span>
    </span>
  ) : (
    <Pill tone="ai" icon={Wand2} className="h-[18px] px-1.5 text-[10px]">
      Action plan
    </Pill>
  );
}

// ─── Day & week: time grid ──────────────────────────────────────────────────

export function TimeGrid({
  days,
  meetings,
  projects,
  userId,
  today,
  now,
  detailed = false,
  onPickDay,
}: ViewProps & { days: ISODate[]; detailed?: boolean; onPickDay?: (d: ISODate) => void }) {
  const byDay = new Map(days.map((d) => [d, meetings.filter((m) => dateOf(m.start) === d)]));
  const inRange = [...byDay.values()].flat();
  // 08:00–18:00, stretched if a meeting falls outside working hours.
  const startHour = Math.min(8, ...inRange.map((m) => Math.floor(minutesOf(m.start) / 60)));
  const endHour = Math.max(18, ...inRange.map((m) => Math.ceil(minutesOf(m.end) / 60)));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = hours.length * HOUR;
  const nowMin = minutesOf(now.toISOString());
  const showNow = days.includes(today) && nowMin >= startHour * 60 && nowMin <= endHour * 60;
  const cols = `${GUTTER} repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className={cn("scrollbar-thin overflow-x-auto", days.length > 1 && "-mx-px")}>
      <div className={cn(days.length > 1 && "min-w-[620px]")}>
        <div className="grid border-b" style={{ gridTemplateColumns: cols }}>
          <div aria-hidden />
          {days.map((d) => {
            const isToday = d === today;
            const inner = (
              <>
                <span className={cn("text-[11px] font-medium tracking-wide uppercase", isToday ? "text-primary" : "text-muted-foreground")}>{formatDate(d, detailed ? "EEEE" : "EEE")}</span>
                <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular", isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>
                  {formatDate(d, "d")}
                </span>
                {detailed && <span className="text-[11px] text-muted-foreground">{formatDate(d, "MMMM")}</span>}
              </>
            );
            return (
              <div key={d} className={cn("border-l", isWeekend(d) && "bg-muted/40")}>
                {onPickDay ? (
                  <button
                    type="button"
                    onClick={() => onPickDay(d)}
                    className="flex w-full items-center justify-center gap-1.5 px-1 py-2 outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    aria-label={`Open day view for ${formatDate(d, "EEEE d MMMM")}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 px-1 py-2">{inner}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative grid" style={{ gridTemplateColumns: cols, height }}>
          <div className="relative" aria-hidden>
            {hours.map((h, i) => (
              <span key={h} className={cn("absolute right-2 text-[10px] text-muted-foreground tabular", i > 0 && "-translate-y-1/2")} style={{ top: i === 0 ? 2 : i * HOUR }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((d) => {
            const isToday = d === today;
            const placed = layoutDay(byDay.get(d) ?? []);
            return (
              <div
                key={d}
                className={cn("relative border-l", isWeekend(d) && "bg-muted/40", isToday && "bg-primary/[0.025]")}
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${HOUR / 2}px, color-mix(in oklch, var(--border) 45%, transparent) ${HOUR / 2}px, color-mix(in oklch, var(--border) 45%, transparent) ${HOUR / 2 + 1}px, transparent ${HOUR / 2 + 1}px, transparent ${HOUR}px)`,
                }}
              >
                {placed.map(({ meeting: m, start, end, col, cols: n }) => {
                  const project = m.projectId ? projects.get(m.projectId) : undefined;
                  const top = ((start - startHour * 60) / 60) * HOUR;
                  const h = Math.max(((end - start) / 60) * HOUR - 2, 20);
                  const mine = m.participantIds.includes(userId);
                  const phase = meetingPhase(m, now);
                  const plan = mine && needsActionPlan(m, now);
                  return (
                    <Link
                      key={m.id}
                      href={`/calendar/${m.id}`}
                      aria-label={meetingLabel(m, project)}
                      data-testid="calendar-meeting"
                      className={cn(
                        "@container absolute flex flex-col overflow-hidden rounded-md py-1 pr-1.5 pl-2.5 text-left leading-tight shadow-xs outline-none transition hover:z-20 hover:shadow-lift focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring",
                        toneClass,
                        !mine && cn("border border-dashed", borderToneClass),
                        phase === "ended" && !plan && "opacity-65",
                      )}
                      style={{ top: top + 1, height: h, left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`, ...meetingTone(project?.hue) }}
                    >
                      <span className={cn("absolute inset-y-0 left-0 w-[3px]", barClass)} aria-hidden />
                      <span className={cn("font-semibold", h >= 50 ? (plan ? "truncate text-xs" : "line-clamp-2 text-xs") : "truncate text-[11px]")}>{m.title}</span>
                      {h >= 34 && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] tabular">
                          <span className="truncate opacity-80">{timeRange(m)}</span>
                          {!mine && <Eye className="size-3 shrink-0 opacity-80" aria-hidden />}
                          {phase === "live" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-success" aria-hidden />}
                          {plan && (
                            <span className="ml-auto shrink-0">
                              <span className="hidden @[11rem]:inline-flex">
                                <ActionPlanBadge />
                              </span>
                              <span className="inline-flex @[11rem]:hidden">
                                <ActionPlanBadge compact />
                              </span>
                            </span>
                          )}
                        </span>
                      )}
                      {detailed && h > 80 && (
                        <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] opacity-85">
                          <MapPin className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{m.location}</span>
                        </span>
                      )}
                      {detailed && h > 100 && (
                        <span className="mt-1.5">
                          <AvatarStack ids={m.participantIds} max={5} />
                        </span>
                      )}
                      {plan && h < 34 && (
                        <span className="absolute top-1 right-1">
                          <ActionPlanBadge compact />
                        </span>
                      )}
                    </Link>
                  );
                })}
                {isToday && showNow && (
                  <div className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: ((nowMin - startHour * 60) / 60) * HOUR }} aria-hidden>
                    <span className="-ml-1 size-2 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month ───────────────────────────────────────────────────────────────────

export function MonthView({ days, month, meetings, projects, userId, today, now, onPickDay }: ViewProps & { days: ISODate[]; month: string; onPickDay: (d: ISODate) => void }) {
  const MAX = 3;
  return (
    <div>
      <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase" aria-hidden>
        {days.slice(0, 7).map((d) => (
          <div key={d} className="py-2">
            <span className="hidden sm:inline">{formatDate(d, "EEE")}</span>
            <span className="sm:hidden">{formatDate(d, "EEEEE")}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = meetings.filter((m) => dateOf(m.start) === d);
          const outside = d.slice(0, 7) !== month;
          const isToday = d === today;
          return (
            <div key={d} className={cn("min-h-16 min-w-0 border-b p-1 sm:min-h-28 sm:p-1.5", i % 7 !== 0 && "border-l", outside && "bg-muted/35", isWeekend(d) && !outside && "bg-muted/20")}>
              <button
                type="button"
                onClick={() => onPickDay(d)}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular transition outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  outside && "text-muted-foreground/70",
                  isToday && "bg-primary text-primary-foreground hover:bg-primary/85",
                )}
                aria-label={`${formatDate(d, "EEEE d MMMM")}: ${list.length} meeting${list.length === 1 ? "" : "s"}. Open day view`}
              >
                {formatDate(d, "d")}
              </button>
              {/* Phones: coloured dots; tap the date for the day view. */}
              {list.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                  {list.slice(0, 4).map((m) => (
                    <span key={m.id} className={cn("size-1.5 rounded-full", barClass)} style={meetingTone(m.projectId ? projects.get(m.projectId)?.hue : undefined)} />
                  ))}
                </div>
              )}
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, MAX).map((m) => {
                  const project = m.projectId ? projects.get(m.projectId) : undefined;
                  const mine = m.participantIds.includes(userId);
                  const plan = mine && needsActionPlan(m, now);
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/calendar/${m.id}`}
                        aria-label={meetingLabel(m, project)}
                        className={cn(
                          "flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-110",
                          toneClass,
                          !mine && cn("border border-dashed", borderToneClass),
                          meetingPhase(m, now) === "ended" && !plan && "opacity-65",
                        )}
                        style={meetingTone(project?.hue)}
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", barClass)} aria-hidden />
                        <span className="shrink-0 tabular opacity-80">{formatTime(m.start)}</span>
                        <span className="truncate font-medium">{m.title}</span>
                        {plan && <ActionPlanBadge compact />}
                      </Link>
                    </li>
                  );
                })}
                {list.length > MAX && (
                  <li>
                    <button type="button" onClick={() => onPickDay(d)} className="rounded px-1 text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                      +{list.length - MAX} more
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

export function AgendaView({ days, meetings, projects, userId, today, now }: ViewProps & { days: ISODate[] }) {
  const groups = days.map((d) => ({ date: d, list: meetings.filter((m) => dateOf(m.start) === d) })).filter((g) => g.list.length > 0);
  if (groups.length === 0) return <EmptyState icon={CalendarDays} title="No meetings in this period" description="Use the arrows to look at other weeks." className="m-4" />;
  return (
    <ol className="divide-y" data-testid="agenda">
      {groups.map(({ date, list }) => {
        const rel = relativeDay(date, today);
        return (
          <li key={date} className="grid grid-cols-[minmax(0,1fr)] gap-2 px-3 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:px-4">
            <div className="flex items-baseline gap-2 sm:block">
              <p className={cn("text-sm font-semibold", date === today && "text-primary")}>{formatDate(date, "EEE d MMM")}</p>
              <p className="text-xs text-muted-foreground">
                {rel && `${rel} · `}
                {list.length} meeting{list.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="space-y-1.5">
              {list.map((m) => {
                const project = m.projectId ? projects.get(m.projectId) : undefined;
                const mine = m.participantIds.includes(userId);
                const phase = meetingPhase(m, now);
                const plan = mine && needsActionPlan(m, now);
                return (
                  <li key={m.id}>
                    <Link
                      href={`/calendar/${m.id}`}
                      aria-label={meetingLabel(m, project)}
                      data-testid="calendar-meeting"
                      className={cn(
                        "group flex items-stretch gap-3 rounded-lg border px-3 py-2.5 outline-none transition hover:border-primary/25 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                        !mine && "border-dashed",
                        phase === "ended" && !plan && "opacity-70",
                      )}
                      style={meetingTone(project?.hue)}
                    >
                      <span className={cn("w-1 shrink-0 rounded-full", barClass)} aria-hidden />
                      <div className="w-11 shrink-0 pt-px sm:w-14">
                        <p className="text-xs font-semibold tabular">{formatTime(m.start)}</p>
                        <p className="text-[11px] text-muted-foreground tabular">{formatTime(m.end)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium group-hover:text-primary">{m.title}</p>
                        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          {project && <span className="truncate">{project.name}</span>}
                          {project && <span aria-hidden>·</span>}
                          <span className="truncate">{m.location}</span>
                        </p>
                        {(phase === "live" || plan) && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">
                            {phase === "live" && <Pill tone="success">Now</Pill>}
                            {plan && <ActionPlanBadge />}
                          </div>
                        )}
                      </div>
                      <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        {phase === "live" && <Pill tone="success">Now</Pill>}
                        {plan && <ActionPlanBadge />}
                        {!mine && (
                          <Pill icon={Eye} className="hidden md:inline-flex">
                            Not invited
                          </Pill>
                        )}
                        <AvatarStack ids={m.participantIds} max={3} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
