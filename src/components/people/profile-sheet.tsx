"use client";

import Link from "next/link";
import { Building2, FolderKanban, Lock, Mail, MapPin, MessagesSquare, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { canViewProject } from "@/lib/permissions";
import { employeeById, type S } from "@/lib/selectors";
import type { Employee } from "@/lib/types";
import { Pill } from "@/components/common/badges";
import { AvatarStack, PersonAvatar } from "@/components/common/person-avatar";
import { askAboutPrompt, projectsOf } from "./directory";
import { AvailabilityPill } from "./person-card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * Professional profile only: role, skills, expertise, projects, availability and
 * responsibilities. Never messages, hours or logbooks, also not for a manager.
 */
export function ProfileSheet({ s, person, onOpenPerson, onAsk }: { s: S; person: Employee; onOpenPerson: (id: string) => void; onAsk: (prompt: string) => void }) {
  const isMe = person.id === s.currentUserId;
  const manager = employeeById(person.managerId);
  const projects = projectsOf(s, person.id);
  const approves = (person.approves?.projectIds ?? []).map((id) => s.projects.find((p) => p.id === id)).filter((p) => p !== undefined);
  const signsOffFor = person.approves?.teamMemberIds ?? [];

  return (
    <>
      <SheetHeader className="gap-3 border-b pr-12">
        <div className="flex items-start gap-4">
          <PersonAvatar person={person} size="xl" showStatus />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-lg font-semibold tracking-tight">{person.name}</SheetTitle>
              {isMe && <Pill tone="primary">This is you</Pill>}
            </div>
            <SheetDescription className="text-foreground/80">{person.role}</SheetDescription>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" aria-hidden /> {person.department}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {person.location}
              </span>
            </p>
            <div className="mt-2">
              <AvailabilityPill value={person.availability} />
            </div>
          </div>
        </div>
        {isMe ? (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/settings">
              <Settings /> Settings and demo user
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAsk(`Draft a Teams message to ${person.firstName}`)}>
              <MessagesSquare /> Draft Teams message
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAsk(askAboutPrompt(person))}>
              <Sparkles className="text-ai" /> Ask assistant about {person.firstName}
            </Button>
          </div>
        )}
      </SheetHeader>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <Section title="Expertise">
          <p className="text-sm leading-relaxed">{person.expertise}</p>
        </Section>

        <Section title="Responsibilities">
          <ul className="ml-4 list-disc space-y-1 text-sm marker:text-muted-foreground/60">
            {person.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="Skills">
          <ul className="flex flex-wrap gap-1.5">
            {person.skills.map((sk) => (
              <li key={sk} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                {sk}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Projects">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects to show.</p>
          ) : (
            <ul className="space-y-1">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted">
                    <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{p.name}</span>
                    {p.ownerId === person.id && <Pill className="ml-auto">Owner</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {manager && (
          <Section title="Manager">
            <button type="button" onClick={() => onOpenPerson(manager.id)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <PersonAvatar person={manager} size="md" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{manager.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{manager.role}</span>
              </span>
            </button>
          </Section>
        )}

        {(approves.length > 0 || signsOffFor.length > 0) && (
          <Section title="Approver for">
            <div className="space-y-2 rounded-lg border p-3">
              {approves.length > 0 && (
                <>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-warning" aria-hidden /> Decides on access requests for
                  </p>
                  <ul className="space-y-1">
                    {approves.map((p) => {
                      const visible = canViewProject(s, s.currentUserId, p);
                      return (
                        <li key={p.id} className="flex items-center gap-2 text-sm">
                          <Link href={`/projects/${p.id}`} className="truncate hover:text-primary hover:underline">
                            {p.name}
                          </Link>
                          {!visible && (
                            <Pill tone="warning" icon={Lock}>
                              Restricted
                            </Pill>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {signsOffFor.length > 0 && (
                <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  Signs off timesheets for <AvatarStack ids={signsOffFor} max={5} />
                </p>
              )}
            </div>
          </Section>
        )}

        <Section title="Contact">
          <p className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground" aria-hidden />
            <span className="truncate">{person.email}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Fictional address. Nothing is sent from this demo.</p>
        </Section>
      </div>

      <p className="flex items-start gap-2 border-t px-4 py-3 text-[11px] text-muted-foreground">
        <Lock className="mt-px size-3 shrink-0" aria-hidden />
        {isMe
          ? "Your messages, hours and logbook are private to you. Others only see this professional profile."
          : `Professional profile only. ${person.firstName}'s messages, hours and logbook stay private, also for managers.`}
      </p>
    </>
  );
}
