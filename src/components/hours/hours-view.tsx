"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Globe, ListChecks, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoursStatusBadge, Pill } from "@/components/common/badges";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { EmptyState, PageHeader, Panel, ProgressBar } from "@/components/common/layout";
import { entriesForWeek, formatHours, hoursByProject, totalHours, weekStatus } from "@/lib/hours";
import { approvesHoursFor } from "@/lib/permissions";
import { employeeById, me } from "@/lib/selectors";
import { addDaysISO, formatDate, mondayOf, weekDates } from "@/lib/time";
import type { HoursEntry, ID, ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EntriesTable } from "./entries-table";
import { HoursEntryDialog } from "./hours-entry-dialog";
import { hoursPerDay, teamWeeks, weekFromParam, weekLabel } from "./hours-logic";
import { SubmitWeekDialog } from "./submit-week-dialog";
import { TeamApproval } from "./team-approval";

const TARGET = 40;

function WeekSummary({ entries, monday, today, colorFor }: { entries: HoursEntry[]; monday: ISODate; today: ISODate; colorFor: (id?: ID) => string }) {
  const s = useS();
  const total = totalHours(entries);
  const drafts = entries.filter((e) => e.status === "draft" || e.status === "rejected").length;
  const perDay = hoursPerDay(entries, weekDates(monday));
  const byProject = Object.entries(hoursByProject(entries)).sort((a, b) => b[1] - a[1]);
  const remaining = TARGET - total;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.1fr)]">
      <section className="rounded-xl border bg-card p-4 shadow-card" aria-label="Week total">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Total this week</p>
          <HoursStatusBadge status={weekStatus(entries)} />
        </div>
        <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular" data-testid="week-total">
          {formatHours(total)}
        </p>
        <p className="text-xs text-muted-foreground">of {formatHours(TARGET)} target</p>
        <ProgressBar value={(total / TARGET) * 100} tone={total >= TARGET ? "success" : "primary"} className="mt-3" label="Progress towards 40 hours" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={cn(remaining <= 0 ? "text-success" : "text-muted-foreground")}>{remaining > 0 ? `${formatHours(remaining)} to go` : remaining < 0 ? `${formatHours(-remaining)} over target` : "Target reached"}</span>
          <span className="text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {drafts > 0 && ` · ${drafts} not submitted`}
          </span>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card" aria-labelledby="per-day-heading">
        <p id="per-day-heading" className="text-xs font-medium text-muted-foreground">
          Per day
        </p>
        <ol className="mt-3 grid grid-cols-7 gap-1.5">
          {perDay.map((d, i) => {
            const isToday = d.date === today;
            const weekend = i >= 5;
            return (
              <li key={d.date} className="flex min-w-0 flex-col items-center gap-1" aria-label={`${formatDate(d.date, "EEEE d MMMM")}: ${formatHours(d.hours)} hours`}>
                <div className={cn("relative flex h-20 w-full max-w-9 items-end overflow-hidden rounded-md bg-muted", isToday && "ring-2 ring-primary/40 ring-offset-1 ring-offset-card")} aria-hidden>
                  <span className="absolute inset-x-0 bottom-[80%] border-t border-dashed border-muted-foreground/30" />
                  <span className={cn("w-full rounded-md transition-[height] duration-500", weekend ? "bg-chart-1/45" : "bg-chart-1")} style={{ height: `${Math.min(100, (d.hours / 10) * 100)}%` }} />
                </div>
                <span className={cn("text-[11px] font-semibold tabular", !d.hours && "font-normal text-muted-foreground/60")} aria-hidden>
                  {d.hours ? formatHours(d.hours) : "0:00"}
                </span>
                <span className={cn("text-[11px] text-muted-foreground", isToday && "font-semibold text-primary")} aria-hidden>
                  {formatDate(d.date, "EEE")}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-[11px] text-muted-foreground">Dashed line: 8 hours</p>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-card" aria-labelledby="per-project-heading">
        <p id="per-project-heading" className="text-xs font-medium text-muted-foreground">
          Per project
        </p>
        {byProject.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hours yet.</p>
        ) : (
          <>
            <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              {byProject.map(([pid, h]) => (
                <span key={pid} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(h / total) * 100}%`, background: colorFor(pid === "none" ? undefined : pid) }} />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {byProject.map(([pid, h]) => (
                <li key={pid} className="flex items-center gap-2 text-xs">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: colorFor(pid === "none" ? undefined : pid) }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.projects.find((p) => p.id === pid)?.name ?? "No project / learning"}</span>
                  <span className="font-semibold tabular">{formatHours(h)}</span>
                  <span className="w-9 text-right text-muted-foreground tabular">{Math.round((h / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

export function HoursView() {
  const s = useS();
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  usePageContext({ kind: "page", label: "Hours" });

  const user = me(s);
  const team = approvesHoursFor(s.currentUserId);
  const isApprover = team.length > 0;
  const thisMonday = mondayOf(today);
  const monday = weekFromParam(params.get("week"), today);
  const tab = isApprover && params.get("tab") === "team" ? "team" : "mine";

  const [dialog, setDialog] = useState<{ open: boolean; editId?: ID }>({ open: false });
  const [submitOpen, setSubmitOpen] = useState(false);

  // "?new=1" (dashboard, command palette, top bar) opens the form, also when already on this page.
  const newParam = params.get("new");
  const [seenNew, setSeenNew] = useState<string | null>(null);
  if (newParam !== seenNew) {
    setSeenNew(newParam);
    if (newParam === "1") setDialog({ open: true });
  }

  function navigate(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const goToWeek = (m: ISODate) => navigate({ week: m === thisMonday ? null : m });

  const entries = entriesForWeek(s.hours, s.currentUserId, monday);
  const editing = dialog.editId ? s.hours.find((h) => h.id === dialog.editId && h.userId === s.currentUserId) : undefined;
  const submittable = entries.some((e) => e.status === "draft" || e.status === "rejected");
  const pendingTeam = isApprover ? teamWeeks(s.hours, team, "submitted").length : 0;
  const rejected = entries.filter((e) => e.status === "rejected").length;

  // One colour per project, stable within the week: the order of the per-project breakdown.
  const projectOrder = Object.entries(hoursByProject(entries))
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => pid)
    .filter((pid) => pid !== "none");
  const colorFor = (pid?: ID) => (pid && projectOrder.includes(pid) ? `var(--chart-${(projectOrder.indexOf(pid) % 5) + 1})` : "color-mix(in oklch, var(--muted-foreground) 45%, transparent)");

  const closeDialog = (savedDate?: ISODate) => {
    setDialog({ open: false });
    const patch: Record<string, string | null> = {};
    if (params.has("new")) patch.new = null;
    if (savedDate && mondayOf(savedDate) !== monday) patch.week = mondayOf(savedDate) === thisMonday ? null : mondayOf(savedDate);
    if (Object.keys(patch).length) navigate(patch);
  };

  const myHours = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="outline" onClick={() => goToWeek(addDaysISO(monday, -7))} aria-label="Previous week" data-testid="week-prev">
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="outline" onClick={() => goToWeek(thisMonday)} disabled={monday === thisMonday}>
              This week
            </Button>
            <Button size="icon-sm" variant="outline" onClick={() => goToWeek(addDaysISO(monday, 7))} aria-label="Next week" data-testid="week-next">
              <ChevronRight />
            </Button>
          </div>
          <h2 className="text-sm font-semibold tabular" aria-live="polite" data-testid="week-label">
            {weekLabel(monday)}
          </h2>
        </div>
        <Button onClick={() => setSubmitOpen(true)} disabled={!submittable} data-testid="submit-week">
          <Send /> Submit week
        </Button>
      </div>

      {rejected > 0 && (
        <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          {rejected} {rejected === 1 ? "entry was" : "entries were"} returned. Check {rejected === 1 ? "it" : "them"}, then submit the week again.
        </p>
      )}

      <WeekSummary entries={entries} monday={monday} today={today} colorFor={colorFor} />

      <Panel
        title="Entries"
        icon={ListChecks}
        description={submittable ? "Drafts are saved automatically. Submit the week when it is complete." : entries.length ? "This week is submitted. Entries are locked until a decision." : undefined}
        bodyClassName="p-0"
        action={
          entries.length > 0 && (
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground md:flex" aria-hidden>
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l-2 border-dashed border-muted-foreground/45" /> Draft
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l-2 border-info" /> Submitted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l-2 border-success" /> Approved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 border-l-2 border-danger" /> Returned
              </span>
            </div>
          )
        }
      >
        {entries.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No hours in this week"
            description="Add an entry for each day or part of a day you worked."
            className="m-4"
            action={
              <Button size="sm" onClick={() => setDialog({ open: true })}>
                <Plus /> Add entry
              </Button>
            }
          />
        ) : (
          <EntriesTable entries={entries} colorFor={colorFor} managerName={employeeById(user.managerId)?.name} onEdit={(id) => setDialog({ open: true, editId: id })} />
        )}
      </Panel>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Globe className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Hours are calculated in Europe/Amsterdam time, including daylight-saving changes. Submission and approval are simulated in this demo.
      </p>
    </div>
  );

  // Default date for a new entry: today when it is in the week on screen, otherwise that week's Monday.
  const defaultDate = mondayOf(today) === monday ? today : monday;

  return (
    <div>
      <PageHeader
        title="Hours"
        icon={Clock}
        description="Register your working time per day. Entries stay drafts until you submit the week."
        actions={
          <Button onClick={() => setDialog({ open: true })} data-testid="add-hours">
            <Plus /> Add entry
          </Button>
        }
      />

      {isApprover ? (
        <Tabs value={tab} onValueChange={(v) => navigate({ tab: v === "team" ? "team" : null })} className="gap-4">
          <TabsList>
            <TabsTrigger value="mine" className="px-3">
              My hours
            </TabsTrigger>
            <TabsTrigger value="team" className="px-3" data-testid="team-tab">
              Team approval
              {pendingTeam > 0 && (
                <Pill tone="info" className="ml-0.5">
                  {pendingTeam}
                </Pill>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine">{myHours}</TabsContent>
          <TabsContent value="team">
            <TeamApproval />
          </TabsContent>
        </Tabs>
      ) : (
        myHours
      )}

      <HoursEntryDialog open={dialog.open} editing={editing} defaultDate={defaultDate} onClose={() => closeDialog()} onSaved={(date) => closeDialog(date)} />
      <SubmitWeekDialog open={submitOpen} onOpenChange={setSubmitOpen} monday={monday} today={today} entries={entries} managerId={user.managerId} />
    </div>
  );
}
