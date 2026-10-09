"use client";

import { Building2, FolderKanban, MapPin } from "lucide-react";
import type { S } from "@/lib/selectors";
import type { Availability, Employee } from "@/lib/types";
import { Pill } from "@/components/common/badges";
import { availabilityLabel, PersonAvatar } from "@/components/common/person-avatar";
import { projectsOf } from "./directory";

export const availabilityTone: Record<Availability, "success" | "danger" | "warning" | "neutral"> = {
  available: "success",
  busy: "danger",
  "in-meeting": "warning",
  away: "neutral",
  offline: "neutral",
};

export function AvailabilityPill({ value }: { value: Availability }) {
  const tone = availabilityTone[value];
  return (
    <Pill tone={tone}>
      <span className={tone === "success" ? "size-1.5 rounded-full bg-success" : tone === "danger" ? "size-1.5 rounded-full bg-danger" : tone === "warning" ? "size-1.5 rounded-full bg-warning" : "size-1.5 rounded-full bg-muted-foreground/50"} aria-hidden />
      {availabilityLabel[value]}
    </Pill>
  );
}

export function PersonCard({ s, person, onOpen }: { s: S; person: Employee; onOpen: () => void }) {
  const isMe = person.id === s.currentUserId;
  const projects = projectsOf(s, person.id);
  return (
    <article
      data-testid="person-card"
      className="group relative flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-card transition-all focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-px hover:border-primary/30 hover:shadow-lift"
    >
      <div className="flex items-start gap-3">
        <PersonAvatar person={person} size="lg" showStatus />
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            <button type="button" onClick={onOpen} className="truncate text-left outline-none after:absolute after:inset-0 after:rounded-xl group-hover:text-primary">
              {person.name}
            </button>
            {isMe && <Pill tone="primary">You</Pill>}
          </h3>
          <p className="truncate text-xs text-foreground/80">{person.role}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" aria-hidden /> {person.department}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden /> {person.location}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3">
        <AvailabilityPill value={person.availability} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-1" aria-label="Top skills">
        {person.skills.slice(0, 4).map((sk) => (
          <li key={sk} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {sk}
          </li>
        ))}
        {person.skills.length > 4 && <li className="px-1 py-0.5 text-[11px] text-muted-foreground">+{person.skills.length - 4}</li>}
      </ul>

      {projects.length > 0 && (
        <p className="mt-auto flex items-start gap-1.5 pt-3 text-[11px] text-muted-foreground">
          <FolderKanban className="mt-px size-3 shrink-0" aria-hidden />
          <span className="line-clamp-2">{projects.map((p) => p.name).join(" · ")}</span>
        </p>
      )}
    </article>
  );
}
