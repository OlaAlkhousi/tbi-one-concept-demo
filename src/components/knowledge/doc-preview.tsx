"use client";

import Link from "next/link";
import { CalendarClock, Database, FolderKanban, Globe, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { approverFor, canViewDocument } from "@/lib/permissions";
import { employeeById, type S } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { KnowledgeDocument } from "@/lib/types";
import { RestrictedNotice } from "@/components/common/access";
import { Pill } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import { categoryIcon, visibleLinkedProjects } from "./doc-card";

/** Explains why a restricted document is readable for this user. */
function accessReason(s: S, doc: KnowledgeDocument): string {
  const u = s.currentUserId;
  if (doc.allowedUserIds?.includes(u)) return "You are on this document's reader list.";
  if (s.accessGrants.some((g) => g.userId === u && g.resourceType === "document" && g.resourceId === doc.id)) return "Your access request for this document was approved.";
  const member = s.projects.find((p) => doc.projectIds.includes(p.id) && p.teamIds.includes(u));
  if (member) return `You are a member of ${member.name}.`;
  const granted = s.projects.find((p) => doc.projectIds.includes(p.id) && s.accessGrants.some((g) => g.userId === u && g.resourceType === "project" && g.resourceId === p.id));
  return granted ? `You have approved access to ${granted.name}.` : "You have access to this document.";
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export function DocPreview({ s, doc, onAsk }: { s: S; doc: KnowledgeDocument; onAsk: () => void }) {
  const readable = canViewDocument(s, s.currentUserId, doc);

  if (!readable) {
    return (
      <>
        <SheetHeader className="sr-only">
          <SheetTitle>{doc.title}</SheetTitle>
          <SheetDescription>Restricted {doc.category.toLowerCase()} document</SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 pt-14">
          <RestrictedNotice resourceType="document" resourceId={doc.id} name={doc.title} ownerId={doc.ownerId} approverId={approverFor(s, "document", doc)} />
        </div>
      </>
    );
  }

  const owner = employeeById(doc.ownerId);
  const Icon = categoryIcon[doc.category];
  const projects = visibleLinkedProjects(s, doc.projectIds);

  return (
    <>
      <SheetHeader className="gap-2 border-b pr-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="primary" icon={Icon}>
            {doc.category}
          </Pill>
          {doc.visibility === "restricted" ? (
            <Pill tone="warning" icon={Lock}>
              Restricted
            </Pill>
          ) : (
            <Pill icon={Globe}>Internal</Pill>
          )}
        </div>
        <SheetTitle className="text-lg leading-snug font-semibold tracking-tight">{doc.title}</SheetTitle>
        <SheetDescription>{doc.summary}</SheetDescription>
      </SheetHeader>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {doc.visibility === "restricted" && (
          <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>Confidential. {accessReason(s, doc)} Don&apos;t share it outside the people who have access.</span>
          </p>
        )}

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Meta label="Owner">
            <Link href={`/people?person=${doc.ownerId}`} className="flex items-center gap-2 font-medium hover:text-primary hover:underline">
              <PersonAvatar person={owner} size="xs" />
              <span className="truncate">{owner?.name}</span>
            </Link>
          </Meta>
          <Meta label="Last updated">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
              {formatDate(doc.updatedAt, "d MMMM yyyy")}
            </span>
          </Meta>
          <Meta label="Source">
            <span className="flex items-start gap-1.5">
              <Database className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {doc.source}
            </span>
          </Meta>
          <Meta label="Who can read it">{doc.visibility === "restricted" ? "Project members and approved readers" : "Everyone in the organisation"}</Meta>
        </dl>

        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={onAsk}>
          <Sparkles className="text-ai" /> Ask the assistant about this document
        </Button>

        <article className="space-y-5" aria-label="Document content">
          {doc.sections.map((sec) => (
            <section key={sec.heading}>
              <h3 className="text-sm font-semibold">{sec.heading}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{sec.body}</p>
            </section>
          ))}
        </article>

        {projects.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Related projects</h3>
            <ul className="mt-2 space-y-1">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted">
                    <FolderKanban className="size-4 text-muted-foreground" aria-hidden />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{p.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Tags</h3>
          <ul className="mt-2 flex flex-wrap gap-1">
            {doc.tags.map((t) => (
              <li key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                #{t}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="border-t px-4 py-3 text-[11px] text-muted-foreground">Placeholder document written for this demo, not a real company document.</p>
    </>
  );
}
