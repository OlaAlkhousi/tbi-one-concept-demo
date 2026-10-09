"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarX2, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canViewMeeting } from "@/lib/permissions";
import { projectById } from "@/lib/selectors";
import { dateOf, formatDate, formatTime } from "@/lib/time";
import type { ID } from "@/lib/types";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { Pill } from "@/components/common/badges";
import { ActionPlan, FollowUpTasks } from "@/components/calendar/action-plan";
import { AboutPanel, DetailsPanel, NoSummary, ParticipantsPanel, PrepareCard, SummaryCard } from "@/components/calendar/meeting-sections";
import { hueSwatch, meetingPhase, relativeDay, useNow } from "@/components/calendar/utils";

export default function MeetingPage() {
  // useSearchParams (for ?plan=1) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <MeetingRoute />
    </Suspense>
  );
}

function MeetingRoute() {
  const { id } = useParams<{ id: string }>();
  // Fresh state per meeting, so an open plan never carries over to another meeting.
  return <MeetingDetail key={id} id={id} />;
}

const backLink = (
  <Button asChild variant="outline" size="sm">
    <Link href="/calendar">
      <ArrowLeft /> Back to calendar
    </Link>
  </Button>
);

function MeetingDetail({ id }: { id: ID }) {
  const s = useS();
  const today = useToday();
  const now = useNow();
  const router = useRouter();
  const search = useSearchParams();
  const meeting = s.meetings.find((m) => m.id === id);
  const allowed = meeting ? canViewMeeting(s, s.currentUserId, meeting) : false;
  // Never hand a restricted meeting's title to the assistant.
  usePageContext(meeting && allowed ? { kind: "meeting", id: meeting.id, label: meeting.title } : { kind: "page", label: "Calendar" });

  const participant = Boolean(meeting?.participantIds.includes(s.currentUserId));
  const canPlan = Boolean(meeting && allowed && participant && meeting.actionPoints?.length && !meeting.actionPlanCreatedAt);

  // The plan belongs to the user who opened it; switching demo user closes it.
  const wantsPlan = search.get("plan") === "1";
  const [planFor, setPlanFor] = useState<ID | null>(wantsPlan && canPlan ? s.currentUserId : null);
  const [prevWants, setPrevWants] = useState(wantsPlan);
  if (wantsPlan !== prevWants) {
    setPrevWants(wantsPlan);
    if (wantsPlan && canPlan) setPlanFor(s.currentUserId);
  }
  if (planFor && planFor !== s.currentUserId) setPlanFor(null);
  const planOpen = planFor === s.currentUserId;

  if (!meeting) {
    return <EmptyState icon={CalendarX2} title="Meeting not found" description="It may have been removed, or the link is incomplete." action={backLink} className="mt-6" />;
  }
  if (!allowed) {
    return (
      <EmptyState
        icon={Lock}
        title="This meeting is private"
        description="Only its participants, and members of its project, can see the details of this meeting."
        action={backLink}
        className="mt-6"
      />
    );
  }

  const phase = meetingPhase(meeting, now);
  const hasSummary = Boolean(meeting.summary || meeting.keyPoints?.length || meeting.actionPoints?.length);
  const showPrepare = !hasSummary && phase !== "ended";
  const project = projectById(s, meeting.projectId);
  const rel = relativeDay(dateOf(meeting.start), today);

  function closePlan() {
    setPlanFor(null);
    if (wantsPlan) router.replace(`/calendar/${id}`, { scroll: false });
  }

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link href="/calendar" className="inline-flex items-center gap-1 rounded transition hover:text-foreground">
            <ArrowLeft className="size-3" aria-hidden /> Calendar
          </Link>
        }
        icon={CalendarDays}
        title={<span data-testid="meeting-title">{meeting.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {phase === "live" && (
              <Pill tone="success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden /> In progress
              </Pill>
            )}
            {phase === "ended" && <Pill>Ended</Pill>}
            {phase === "upcoming" && <Pill tone="info">Upcoming</Pill>}
            <span>
              {rel ? `${rel}, ` : ""}
              {formatDate(meeting.start, "EEEE d MMMM")} · <span className="tabular">{formatTime(meeting.start)}–{formatTime(meeting.end)}</span>
            </span>
            {project && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={hueSwatch(project.hue)} aria-hidden />
                {project.name}
              </span>
            )}
            {!participant && (
              <Pill icon={Eye} className="ml-0.5">
                Not invited · visible through the project
              </Pill>
            )}
          </span>
        }
      />

      <div className="@container">
        <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-5">
            {hasSummary ? (
              <SummaryCard meeting={meeting} canPlan={canPlan} planOpen={planOpen} onGenerate={() => setPlanFor(s.currentUserId)} />
            ) : showPrepare ? (
              <PrepareCard meeting={meeting} s={s} today={today} />
            ) : (
              <NoSummary />
            )}
            {planOpen ? <ActionPlan meeting={meeting} today={today} onClose={closePlan} /> : <FollowUpTasks meeting={meeting} today={today} />}
            <AboutPanel meeting={meeting} showAgenda={!showPrepare} />
          </div>
          <aside className="min-w-0 space-y-5" aria-label="Meeting details">
            <DetailsPanel meeting={meeting} s={s} today={today} />
            <ParticipantsPanel meeting={meeting} s={s} />
          </aside>
        </div>
      </div>
    </div>
  );
}
