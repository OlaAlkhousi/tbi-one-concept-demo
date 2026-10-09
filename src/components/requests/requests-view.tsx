"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, CheckCircle2, Clock, FileText, FolderKanban, History, Inbox, KeyRound, Lock, ShieldCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeById, me, type S } from "@/lib/selectors";
import { formatDate, timeAgo } from "@/lib/time";
import type { AccessRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { Pill } from "@/components/common/badges";
import { usePageContext, useS } from "@/components/common/hooks";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { DeclineDialog, RequestPicker } from "./request-dialogs";
import { canOpen, resourceHref, resourceRef } from "./resources";

const statusPill: Record<AccessRequest["status"], { label: string; tone: "info" | "success" | "danger"; icon: typeof Clock }> = {
  pending: { label: "Pending", tone: "info", icon: Clock },
  approved: { label: "Approved", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "danger", icon: X },
};

function StatusPill({ status }: { status: AccessRequest["status"] }) {
  const p = statusPill[status];
  return (
    <Pill tone={p.tone} icon={p.icon}>
      {p.label}
    </Pill>
  );
}

function When({ iso, prefix }: { iso: string; prefix: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso, "EEEE d MMMM yyyy, HH:mm")}>
      {prefix} {timeAgo(iso)}
    </time>
  );
}

/** Resource name, type and link. Restricted names are metadata and safe to show; the link leads to a restricted notice if needed. */
function ResourceLink({ s, r }: { s: S; r: AccessRequest }) {
  const res = resourceRef(s, r.resourceType, r.resourceId);
  const Icon = r.resourceType === "project" ? FolderKanban : FileText;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      <Link href={resourceHref(r.resourceType, r.resourceId)} className="font-medium text-primary underline-offset-4 hover:underline">
        {res?.name ?? r.resourceId}
      </Link>
      <Pill icon={Icon} className="capitalize">
        {r.resourceType}
      </Pill>
    </span>
  );
}

function WaitingRow({ s, r, onDecline }: { s: S; r: AccessRequest; onDecline: () => void }) {
  const decideAccess = useWorkspace((x) => x.decideAccess);
  const requester = employeeById(r.requesterId);
  const res = resourceRef(s, r.resourceType, r.resourceId);
  return (
    <li data-testid="request-row" className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <PersonAvatar person={requester} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{requester?.name}</span> <span className="text-muted-foreground">· {requester?.role}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            requests access to <ResourceLink s={s} r={r} />
          </p>
          <blockquote className="mt-2.5 border-l-2 border-primary/30 pl-3 text-sm text-foreground/85 italic">“{r.reason}”</blockquote>
          <p className="mt-2 text-xs text-muted-foreground">
            <When iso={r.createdAt} prefix="Requested" />
          </p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button
            size="sm"
            data-testid="approve-request"
            aria-label={`Approve ${requester?.firstName}'s access to ${res?.name}`}
            onClick={() => {
              decideAccess(r.id, true);
              toast.success("Access approved", { description: `${requester?.firstName} can now open ${res?.name}.` });
            }}
          >
            <Check /> Approve
          </Button>
          <Button size="sm" variant="outline" data-testid="decline-request" aria-label={`Decline ${requester?.firstName}'s access to ${res?.name}`} onClick={onDecline}>
            <X /> Decline
          </Button>
        </div>
      </div>
    </li>
  );
}

function DecidedRow({ s, r }: { s: S; r: AccessRequest }) {
  const requester = employeeById(r.requesterId);
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <PersonAvatar person={requester} size="sm" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{requester?.name}</span>
          <span className="text-muted-foreground">→</span>
          <ResourceLink s={s} r={r} />
          <StatusPill status={r.status} />
        </div>
        {r.decisionNote && <p className="mt-1 text-xs text-muted-foreground">Your note: “{r.decisionNote}”</p>}
        {r.decidedAt && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            <When iso={r.decidedAt} prefix="Decided" />
          </p>
        )}
      </div>
    </li>
  );
}

function MyRequestRow({ s, r }: { s: S; r: AccessRequest }) {
  const approver = employeeById(r.approverId);
  const open = r.status === "approved" && canOpen(s, r.resourceType, r.resourceId);
  return (
    <li data-testid="my-request-row" className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-sm">
          <ResourceLink s={s} r={r} />
          <p className="mt-2 text-sm text-foreground/85 italic">“{r.reason}”</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={r.status} />
          {open && (
            <Button asChild size="xs" variant="outline">
              <Link href={resourceHref(r.resourceType, r.resourceId)}>
                Open <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
      {r.decisionNote && (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs">
          <span className="font-medium">{approver?.firstName}:</span> “{r.decisionNote}”
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <PersonAvatar person={approver} size="xs" /> Approver: {approver?.name}
        </span>
        <When iso={r.createdAt} prefix="Requested" />
        {r.decidedAt && <When iso={r.decidedAt} prefix="Decided" />}
      </div>
    </li>
  );
}

export function RequestsView() {
  const s = useS();
  const user = me(s);
  usePageContext({ kind: "page", label: "Requests" });
  const [declining, setDeclining] = useState<AccessRequest | null>(null);
  const [picking, setPicking] = useState(false);

  const uid = s.currentUserId;
  const waiting = s.accessRequests.filter((r) => r.approverId === uid && r.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const decided = s.accessRequests.filter((r) => r.approverId === uid && r.status !== "pending").sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const mine = s.accessRequests.filter((r) => r.requesterId === uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isApprover = Boolean(user.approves) || waiting.length + decided.length > 0;
  const grants = s.accessGrants.filter((g) => g.userId === uid).length;

  const requestButton = (
    <Button variant="outline" size="sm" onClick={() => setPicking(true)} data-testid="request-access-to">
      <KeyRound /> Request access to…
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        icon={ShieldCheck}
        description={isApprover ? "Decide on access to the restricted projects and documents you approve, and follow your own requests." : "Follow your access requests to restricted projects and documents."}
        actions={requestButton}
      />

      <section className={cn("grid grid-cols-2 gap-3", isApprover && "sm:grid-cols-3")} aria-label="Key figures">
        {isApprover && <StatCard label="Waiting for your decision" value={waiting.length} hint={waiting.length ? "Oldest first" : "All decided"} icon={Inbox} tone={waiting.length ? "warning" : "success"} />}
        <StatCard label="My pending requests" value={mine.filter((r) => r.status === "pending").length} hint={`${mine.length} in total`} icon={Clock} />
        <StatCard label="Access granted to you" value={grants} hint="Through approved requests" icon={KeyRound} tone={grants ? "success" : "default"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {isApprover && (
            <Panel title="Waiting for your decision" icon={Inbox} description="Approving gives the requester access right away. They get a notification either way." bodyClassName="p-3 sm:p-4">
              {waiting.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nothing waiting" description="New access requests for the projects and documents you approve appear here." className="border-0 py-8" />
              ) : (
                <ul className="space-y-3" data-testid="waiting-list">
                  {waiting.map((r) => (
                    <WaitingRow key={r.id} s={s} r={r} onDecline={() => setDeclining(r)} />
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title="My requests" icon={KeyRound} bodyClassName="p-3 sm:p-4">
            {mine.length === 0 ? (
              <EmptyState icon={KeyRound} title="No access requests yet" description="When you need a restricted project or document, request access and follow it here."
                action={
                  <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
                    <KeyRound /> Request access to…
                  </Button>
                }
                className="border-0 py-8"
              />
            ) : (
              <ul className="space-y-3">
                {mine.map((r) => (
                  <MyRequestRow key={r.id} s={s} r={r} />
                ))}
              </ul>
            )}
          </Panel>

          {isApprover && decided.length > 0 && (
            <Panel title="Decided by you" icon={History}>
              <ul className="divide-y">
                {decided.map((r) => (
                  <DecidedRow key={r.id} s={s} r={r} />
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-xl border bg-card p-4 shadow-card" aria-labelledby="access-how" data-testid="access-explainer">
            <h2 id="access-how" className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="size-4 text-warning" aria-hidden /> How access works in TBI ONE
            </h2>
            <ul className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <ShieldCheck className="mt-px size-3.5 shrink-0 text-foreground/70" aria-hidden />
                <span>Every restricted project has one approver. Documents linked to a project follow that project&apos;s approver; other documents go to their owner.</span>
              </li>
              <li className="flex gap-2">
                <UserX className="mt-px size-3.5 shrink-0 text-foreground/70" aria-hidden />
                <span>Managers don&apos;t automatically get access to restricted content, and nobody can read someone else&apos;s messages, hours or logbook.</span>
              </li>
              <li className="flex gap-2">
                <Lock className="mt-px size-3.5 shrink-0 text-foreground/70" aria-hidden />
                <span>Without access you only see a restricted item&apos;s name, owner and approver. Never its content.</span>
              </li>
              <li className="flex gap-2">
                <KeyRound className="mt-px size-3.5 shrink-0 text-foreground/70" aria-hidden />
                <span>
                  Everything here is simulated in your browser. In production, authorisation is enforced server-side with Microsoft Entra ID groups and periodic access reviews, and restricted content never reaches a browser without access.
                </span>
              </li>
            </ul>
            <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setPicking(true)}>
              <KeyRound /> Request access to…
            </Button>
          </section>
        </aside>
      </div>

      <DeclineDialog s={s} request={declining} onClose={() => setDeclining(null)} />
      <RequestPicker s={s} open={picking} onOpenChange={setPicking} />
    </div>
  );
}
