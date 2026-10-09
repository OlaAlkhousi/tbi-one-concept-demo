"use client";

import { BarChart3, BookOpen, ClipboardList, Clock, Compass, FolderKanban, GraduationCap, ListChecks, Lock, Rocket, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canViewProject } from "@/lib/permissions";
import { employeeById, type S } from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";
import { Pill } from "@/components/common/badges";
import { PersonAvatar } from "@/components/common/person-avatar";
import type { DocCategory, DocResult } from "./filter";

export const categoryIcon: Record<DocCategory, LucideIcon> = {
  Reports: BarChart3,
  Guidelines: ListChecks,
  Onboarding: Rocket,
  Procedures: ClipboardList,
  Security: ShieldCheck,
  Handbooks: BookOpen,
  Strategy: Compass,
  Learning: GraduationCap,
};

/** Linked projects the viewer may see. Restricted projects they can't open are left out. */
export function visibleLinkedProjects(s: S, projectIds: string[]): Project[] {
  return projectIds.map((id) => s.projects.find((p) => p.id === id)).filter((p): p is Project => Boolean(p && canViewProject(s, s.currentUserId, p)));
}

export function DocCard({ s, result, onOpen }: { s: S; result: DocResult; onOpen: () => void }) {
  const { doc, readable, matchedSection } = result;
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const owner = employeeById(doc.ownerId);
  const Icon = readable ? categoryIcon[doc.category] : Lock;
  const pending = s.accessRequests.some((r) => r.requesterId === s.currentUserId && r.resourceId === doc.id && r.status === "pending");
  const projects = readable ? visibleLinkedProjects(s, doc.projectIds) : [];

  return (
    <article
      data-testid="doc-card"
      data-restricted={readable ? undefined : "true"}
      className="group relative flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card transition-all focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-px hover:border-primary/30 hover:shadow-lift"
    >
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", readable ? "bg-accent text-accent-foreground" : "bg-warning-soft text-warning")}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-snug font-semibold">
            {/* The stretched ::after makes the whole card clickable while keeping one focusable control. */}
            <button type="button" onClick={onOpen} className="text-left outline-none after:absolute after:inset-0 after:rounded-xl group-hover:text-primary">
              {doc.title}
            </button>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doc.category}
            {readable && <> · updated {formatDate(doc.updatedAt, "d MMM yyyy")}</>}
          </p>
        </div>
        {!readable && (
          <Pill tone="warning" icon={Lock}>
            Restricted
          </Pill>
        )}
      </div>

      {readable ? (
        <>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{doc.summary}</p>
          {matchedSection && <p className="mt-2 text-xs text-ai">Matches in “{matchedSection}”</p>}
          {doc.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1" aria-label="Tags">
              {doc.tags.slice(0, 4).map((t) => (
                <li key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  #{t}
                </li>
              ))}
              {doc.tags.length > 4 && <li className="px-1 py-0.5 text-[11px] text-muted-foreground">+{doc.tags.length - 4}</li>}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PersonAvatar person={owner} size="xs" />
              {owner?.name}
            </span>
            <span className="truncate">{doc.source}</span>
          </div>
          {projects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {projects.map((p) => (
                <span key={p.id} className="inline-flex h-5 max-w-full items-center gap-1 rounded-md border px-1.5 text-[11px] text-muted-foreground">
                  <FolderKanban className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{p.name}</span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">Only project members and people with approved access can read this document.</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PersonAvatar person={owner} size="xs" />
              Owner: {owner?.name}
            </span>
            {pending ? (
              <Pill tone="info" icon={Clock}>
                Request pending
              </Pill>
            ) : (
              <Button size="xs" variant="outline" className="relative z-10" onClick={() => openAccessDialog("document", doc.id)} aria-label={`Request access to ${doc.title}`}>
                <ShieldCheck /> Request access
              </Button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
