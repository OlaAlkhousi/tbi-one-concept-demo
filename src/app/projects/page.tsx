"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Gauge, LayoutGrid, Rows3, Search, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { EmptyState, PageHeader, StatCard } from "@/components/common/layout";
import { Segmented } from "@/components/projects/segmented";
import { LockedProjectCard, ProjectCard } from "@/components/projects/project-card";
import { PortfolioTable } from "@/components/projects/portfolio-table";
import { canViewProject } from "@/lib/permissions";
import { me, myProjects, projectProgress } from "@/lib/selectors";
import type { Project } from "@/lib/types";

type Filter = "all" | "mine" | "risk";
const FILTERS: Filter[] = ["all", "mine", "risk"];

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <Portfolio />
    </Suspense>
  );
}

const atRisk = (p: Project) => p.status === "at-risk" || p.status === "blocked";

function Portfolio() {
  const s = useS();
  const today = useToday();
  const params = useSearchParams();
  usePageContext({ kind: "page", label: "Projects" });

  const user = me(s);
  const canTable = user.persona === "pm" || user.persona === "lead";
  const [filter, setFilter] = useState<Filter>(() => (FILTERS.includes(params.get("filter") as Filter) ? (params.get("filter") as Filter) : "all"));
  const [view, setView] = useState<"cards" | "table">(() => (params.get("view") === "table" ? "table" : "cards"));
  const [query, setQuery] = useState("");

  const readable = (p: Project) => canViewProject(s, s.currentUserId, p);
  const accessible = s.projects.filter(readable);
  const mineIds = new Set(myProjects(s).map((p) => p.id));
  const active = accessible.filter((p) => p.status !== "completed");
  const risky = accessible.filter(atRisk);
  const avg = active.length ? Math.round(active.reduce((sum, p) => sum + projectProgress(s, p), 0) / active.length) : 0;
  const owned = accessible.filter((p) => p.ownerId === s.currentUserId).length;

  const q = query.trim().toLowerCase();
  const matches = (p: Project) => {
    if (!q) return true;
    // Locked projects only expose their name and code, so only those are searchable.
    const haystack = readable(p) ? [p.name, p.code, p.description, ...p.aliases, ...p.technologies] : [p.name, p.code];
    return haystack.some((h) => h.toLowerCase().includes(q));
  };
  const shown = s.projects
    .filter((p) => (filter === "mine" ? mineIds.has(p.id) : filter === "risk" ? readable(p) && atRisk(p) : true))
    .filter(matches)
    // Locked projects go last so the projects you can open come first.
    .sort((a, b) => Number(!readable(a)) - Number(!readable(b)));

  const showTable = canTable && view === "table";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        icon={FolderKanban}
        description="The innovation portfolio. Progress is calculated live from each project's tasks and milestones."
        actions={
          canTable ? (
            <Segmented
              label="Portfolio view"
              value={view}
              onChange={setView}
              options={[
                {
                  value: "cards",
                  label: (
                    <>
                      <LayoutGrid className="size-3.5" aria-hidden /> Cards
                    </>
                  ),
                },
                {
                  value: "table",
                  label: (
                    <>
                      <Rows3 className="size-3.5" aria-hidden /> Table
                    </>
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Portfolio figures">
        <StatCard label="Active projects" value={active.length} hint={`${accessible.filter((p) => p.status === "planning").length} in planning`} icon={FolderKanban} />
        <StatCard
          label="At risk or blocked"
          value={risky.length}
          hint={risky.length ? risky.map((p) => p.code).join(", ") : "Everything on track"}
          icon={TriangleAlert}
          tone={risky.some((p) => p.status === "blocked") ? "danger" : risky.length ? "warning" : "success"}
        />
        <StatCard label="Average progress" value={`${avg}%`} hint="Across active projects you can see" icon={Gauge} />
        <StatCard label="My projects" value={mineIds.size} hint={owned ? `You own ${owned}` : "Where you are a team member"} icon={UserRound} />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filter projects"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: <>All <span className="tabular opacity-70">{s.projects.length}</span></> },
            { value: "mine", label: <>Mine <span className="tabular opacity-70">{mineIds.size}</span></> },
            { value: "risk", label: <>At risk <span className="tabular opacity-70">{risky.length}</span></> },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, code or technology" aria-label="Search projects" className="pl-8" />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match"
          description={filter === "mine" ? "You are not a member of a project that matches." : "Try another search or filter."}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : showTable ? (
        <PortfolioTable s={s} projects={shown} today={today} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Projects">
          {shown.map((p) => (readable(p) ? <ProjectCard key={p.id} s={s} project={p} today={today} /> : <LockedProjectCard key={p.id} s={s} project={p} />))}
        </section>
      )}
    </div>
  );
}
