"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, CheckSquare, Clock, Eye, EyeOff, FileSearch, GitPullRequest, Inbox, LayoutGrid, NotebookPen, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { morningBriefing } from "@/lib/ai/briefing";
import { formatHours } from "@/lib/hours";
import { attentionMessages, hoursThisWeek, me, meetingsOn, myMeetings, myOpenTasks, overdueTasks, pendingApprovals, visiblePullRequests } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { WidgetId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { StatCard } from "@/components/common/layout";
import { WIDGET_META, Widget } from "@/components/dashboard/widgets";

const ALL_WIDGETS = Object.keys(WIDGET_META) as WidgetId[];

function Customize({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useS();
  const layout = s.layouts[s.currentUserId] ?? { order: [], hidden: [] };
  const setLayout = useWorkspace((x) => x.setLayout);
  const resetLayout = useWorkspace((x) => x.resetLayout);
  const order = [...layout.order, ...ALL_WIDGETS.filter((w) => !layout.order.includes(w))];
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setLayout({ order: next, hidden: layout.hidden });
  };
  const visible = (w: WidgetId) => layout.order.includes(w) && !layout.hidden.includes(w);
  const toggle = (w: WidgetId) => {
    const on = visible(w);
    setLayout({ order: layout.order.includes(w) ? layout.order : [...layout.order, w], hidden: on ? [...layout.hidden, w] : layout.hidden.filter((x) => x !== w) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customise your dashboard</DialogTitle>
          <DialogDescription>Show, hide and reorder modules. Saved per demo user.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {order.map((w, i) => (
            <li key={w} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", !visible(w) && "opacity-55")}>
              <span className="flex-1 text-sm">{WIDGET_META[w].title}</span>
              <Button size="icon-xs" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${WIDGET_META[w].title} up`}>
                <ArrowUp />
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${WIDGET_META[w].title} down`}>
                <ArrowDown />
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={() => toggle(w)} aria-label={visible(w) ? `Hide ${WIDGET_META[w].title}` : `Show ${WIDGET_META[w].title}`}>
                {visible(w) ? <Eye /> : <EyeOff />}
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={resetLayout}>
            <RotateCcw /> Reset to role default
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const s = useS();
  const today = useToday();
  const router = useRouter();
  const user = me(s);
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const askAssistant = useWorkspace((x) => x.askAssistant);
  const [customizing, setCustomizing] = useState(false);
  usePageContext({ kind: "page", label: "Home dashboard" });

  const briefing = useMemo(() => morningBriefing(s), [s]);
  const meetings = meetingsOn(s, today);
  const open = myOpenTasks(s);
  const overdue = overdueTasks(s, undefined, today).filter((t) => t.assigneeId === s.currentUserId);
  const attention = attentionMessages(s);
  const approvals = pendingApprovals(s);
  const { total: hours } = hoursThisWeek(s, today);
  const reviews = visiblePullRequests(s).filter((p) => p.state === "open" && p.reviewerIds.includes(s.currentUserId));
  const nextMeeting = myMeetings(s).find((m) => new Date(m.end) > new Date());
  const layout = s.layouts[s.currentUserId];
  const widgets = (layout?.order ?? []).filter((w) => !layout?.hidden.includes(w));

  const fourthStat =
    user.persona === "lead" || user.persona === "pm" ? (
      <StatCard label="Pending approvals" value={approvals.length} hint={approvals.length ? "Access requests waiting" : "All decided"} icon={ShieldCheck} href="/requests" tone={approvals.length ? "warning" : "success"} />
    ) : user.persona === "developer" ? (
      <StatCard label="Reviews requested" value={reviews.length} hint="Pull requests waiting for you" icon={GitPullRequest} href="/github" />
    ) : (
      <StatCard label="Hours this week" value={formatHours(hours)} hint="Registered, Mon–Fri" icon={Clock} href="/hours" />
    );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{formatDate(today, "EEEE d MMMM yyyy")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="greeting">
            {briefing.greeting}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base" data-testid="headline">
            {briefing.headline}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openTaskDialog()}>
            <CheckSquare /> Create task
          </Button>
          {nextMeeting && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/calendar/${nextMeeting.id}`)}>
              <CalendarDays /> Open meeting
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/hours?new=1")}>
            <Clock /> Register hours
          </Button>
          {(user.persona === "intern" || user.persona === "developer") && (
            <Button variant="outline" size="sm" onClick={() => router.push("/logbook?new=1")}>
              <NotebookPen /> Logbook entry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/knowledge?focus=1")}>
            <FileSearch /> Search documents
          </Button>
          <Button size="sm" onClick={() => askAssistant("")} className="bg-gradient-to-r from-primary to-[oklch(0.52_0.2_292)] text-primary-foreground">
            <Sparkles /> Ask AI
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key figures">
        <StatCard label="Meetings today" value={meetings.length} hint={nextMeeting ? `Next: ${formatDate(nextMeeting.start, "HH:mm")} ${nextMeeting.title}` : "No more meetings"} icon={CalendarDays} href="/calendar" />
        <StatCard label="Open tasks" value={open.length} hint={overdue.length ? `${overdue.length} overdue` : "None overdue"} icon={CheckSquare} href="/tasks" tone={overdue.length ? "danger" : "success"} />
        <StatCard label="Needs attention" value={attention.length} hint="Messages to answer or act on" icon={Inbox} href="/inbox?filter=action" tone={attention.length ? "warning" : "default"} />
        {fourthStat}
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Your workspace</h2>
        <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)} data-testid="customize-dashboard">
          <LayoutGrid /> Customise
        </Button>
      </div>

      <section className="grid grid-flow-row-dense gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {widgets.map((w) => (
          <div key={w} className={cn("min-w-0", WIDGET_META[w].span === 2 && "lg:col-span-2")} data-widget={w}>
            <Widget id={w} s={s} today={today} />
          </div>
        ))}
      </section>
      <Customize open={customizing} onOpenChange={setCustomizing} />
    </div>
  );
}
