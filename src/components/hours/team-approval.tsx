"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, EyeOff, Undo2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoursStatusBadge, Pill } from "@/components/common/badges";
import { useS } from "@/components/common/hooks";
import { EmptyState, Panel } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { entryHours, formatHours, hoursByProject } from "@/lib/hours";
import { approvesHoursFor } from "@/lib/permissions";
import { employeeById } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { teamWeeks, weekLabel, type TeamWeek } from "./hours-logic";

const PREVIEW = 4;

function WeekCard({ week, onReturn }: { week: TeamWeek; onReturn: (w: TeamWeek) => void }) {
  const s = useS();
  const decideWeek = useWorkspace((x) => x.decideWeek);
  const [expanded, setExpanded] = useState(false);
  const person = employeeById(week.userId);
  const byProject = Object.entries(hoursByProject(week.entries)).sort((a, b) => b[1] - a[1]);
  const shown = expanded ? week.entries : week.entries.slice(0, PREVIEW);
  const listId = `team-week-${week.userId}-${week.monday}`;

  return (
    <article className="flex flex-col rounded-xl border border-l-2 border-l-info bg-card shadow-card" data-testid="team-week">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar person={person} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{person?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{weekLabel(week.monday)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-tight tabular">{formatHours(week.total)}</p>
          {week.total < 40 ? <Pill tone="warning">Below 40:00</Pill> : <Pill tone="neutral">{week.entries.length} entries</Pill>}
        </div>
      </header>
      <div className="flex-1 px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {byProject.map(([pid, h]) => (
            <Pill key={pid} tone="primary">
              {s.projects.find((p) => p.id === pid)?.name ?? "No project / learning"} · {formatHours(h)}
            </Pill>
          ))}
        </div>
        <ul id={listId} className="divide-y text-sm">
          {shown.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 py-1.5">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{formatDate(e.date, "EEE d MMM")}</span>
              <span className="min-w-0 flex-1 truncate" title={e.description}>
                {e.description}
              </span>
              <span className="shrink-0 font-medium tabular">{formatHours(entryHours(e))}</span>
            </li>
          ))}
        </ul>
        {week.entries.length > PREVIEW && (
          <Button size="xs" variant="ghost" className="mt-1 -ml-2 text-muted-foreground" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-controls={listId}>
            <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
            {expanded ? "Show fewer" : `Show all ${week.entries.length} entries`}
          </Button>
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-2.5">
        <Button size="sm" variant="outline" onClick={() => onReturn(week)} data-testid="return-week">
          <Undo2 /> Return
        </Button>
        <Button
          size="sm"
          data-testid="approve-week"
          onClick={() => {
            decideWeek(week.userId, week.monday, true);
            toast.success(`Approved ${person?.firstName}'s hours`, { description: `${weekLabel(week.monday)} · ${formatHours(week.total)} h (simulated)` });
          }}
        >
          <Check /> Approve
        </Button>
      </footer>
    </article>
  );
}

export function TeamApproval() {
  const s = useS();
  const decideWeek = useWorkspace((x) => x.decideWeek);
  const team = approvesHoursFor(s.currentUserId);
  const pending = teamWeeks(s.hours, team, "submitted");
  const history = teamWeeks(s.hours, team, "approved").slice(0, 6);
  const [returning, setReturning] = useState<TeamWeek | null>(null);
  const returningPerson = employeeById(returning?.userId);

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        You see submitted and approved hours of the {team.length} people you approve for. Their drafts and work logbooks stay private.
      </p>

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold">
          Waiting for your approval <Pill tone={pending.length ? "info" : "neutral"}>{pending.length}</Pill>
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={Users} title="Nothing to approve" description="When someone in your team submits a week, it appears here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((w) => (
              <WeekCard key={`${w.userId}-${w.monday}`} week={w} onReturn={setReturning} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <Panel title="Recently approved" icon={Check} bodyClassName="p-2">
          <ul>
            {history.map((w) => (
              <li key={`${w.userId}-${w.monday}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2">
                <PersonAvatar id={w.userId} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{employeeById(w.userId)?.name}</span>
                <span className="text-xs text-muted-foreground">{weekLabel(w.monday)}</span>
                <span className="w-12 text-right text-sm font-semibold tabular">{formatHours(w.total)}</span>
                <HoursStatusBadge status="approved" />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Dialog open={Boolean(returning)} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return {returningPerson?.firstName}&apos;s hours?</DialogTitle>
            <DialogDescription>{returning && weekLabel(returning.monday)}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {returningPerson?.firstName} gets a notification and can correct the entries and submit the week again. Talk to them about what needs to change. This is simulated.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-return-week"
              onClick={() => {
                if (!returning) return;
                decideWeek(returning.userId, returning.monday, false);
                toast(`Returned ${returningPerson?.firstName}'s hours`, { description: weekLabel(returning.monday) });
                setReturning(null);
              }}
            >
              <Undo2 /> Return hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
