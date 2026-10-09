"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock, Search, UserSearch, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { employees } from "@/lib/data/people";
import type { Availability } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { usePageContext, useS } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { availabilityLabel } from "@/components/common/person-avatar";
import { AskBox } from "@/components/knowledge/ask-box";
import { ChipRow, FilterChip } from "@/components/knowledge/filter-chip";
import { DEPARTMENTS, matchesPerson, popularSkills } from "./directory";
import { PersonCard } from "./person-card";
import { ProfileSheet } from "./profile-sheet";

const SKILLS = popularSkills(10);
const AVAILABILITY = Object.keys(availabilityLabel) as Availability[];

export function PeopleDirectory() {
  const s = useS();
  const router = useRouter();
  const params = useSearchParams();
  const askAssistant = useWorkspace((x) => x.askAssistant);
  usePageContext({ kind: "page", label: "People" });

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability | "any">("any");

  const person = employees.find((e) => e.id === params.get("person"));
  const show = (id: string) => router.push(`/people?person=${id}`, { scroll: false });
  const close = () => router.push("/people", { scroll: false });

  const people = employees
    .filter((e) => matchesPerson(e, query) && (!department || e.department === department) && (!skill || e.skills.includes(skill)) && (availability === "any" || e.availability === availability))
    .sort((a, b) => Number(b.id === s.currentUserId) - Number(a.id === s.currentUserId) || a.name.localeCompare(b.name));
  const filtered = Boolean(query.trim() || department || skill || availability !== "any");
  const reset = () => {
    setQuery("");
    setDepartment(null);
    setSkill(null);
    setAvailability("any");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="People" icon={Users} description="Find colleagues by name, role or skill. Profiles show professional information only." />

      <AskBox
        title="Who can help?"
        description="Describe what you need. The assistant suggests colleagues based on their skills and shared projects."
        placeholder="e.g. Who knows about Azure?"
        suggestions={["Who knows about Azure?", "Who can help with accessibility?", "Who knows about CI/CD pipelines?"]}
      />

      <section aria-label="Search and filters" className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Label htmlFor="people-search" className="sr-only">
              Search people
            </Label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="people-search"
              data-testid="people-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, skill or expertise…"
              className="h-9 pl-8"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="people-availability" className="text-xs whitespace-nowrap text-muted-foreground">
              Availability
            </Label>
            <Select value={availability} onValueChange={(v) => setAvailability(v as Availability | "any")}>
              <SelectTrigger id="people-availability" className="h-9 w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Anyone</SelectItem>
                {AVAILABILITY.map((a) => (
                  <SelectItem key={a} value={a}>
                    {availabilityLabel[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-start">
          <p className="pt-1 text-xs font-medium text-muted-foreground">Department</p>
          <ChipRow label="Filter by department">
            <FilterChip active={!department} onClick={() => setDepartment(null)}>
              All
            </FilterChip>
            {DEPARTMENTS.map((d) => (
              <FilterChip key={d} active={department === d} onClick={() => setDepartment(department === d ? null : d)}>
                {d}
              </FilterChip>
            ))}
          </ChipRow>
          <p className="pt-1 text-xs font-medium text-muted-foreground">Skill</p>
          <ChipRow label="Filter by skill">
            {SKILLS.map((sk) => (
              <FilterChip key={sk} active={skill === sk} onClick={() => setSkill(skill === sk ? null : sk)}>
                {sk}
              </FilterChip>
            ))}
          </ChipRow>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {people.length} {people.length === 1 ? "person" : "people"}
        </p>
        {filtered && (
          <Button variant="ghost" size="xs" onClick={reset}>
            Clear filters
          </Button>
        )}
      </div>

      {people.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title="Nobody matches"
          description="Try a broader search, or ask the assistant who can help."
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((e) => (
            <PersonCard key={e.id} s={s} person={e} onOpen={() => show(e.id)} />
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        All colleagues are fictional. Profiles show role, skills, expertise, projects, availability and responsibilities. Messages, hours and logbooks are never shown here, also not to managers.
      </p>

      <Sheet open={Boolean(person)} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          {person && (
            <ProfileSheet
              s={s}
              person={person}
              onOpenPerson={show}
              onAsk={(prompt) => {
                close();
                askAssistant(prompt);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
