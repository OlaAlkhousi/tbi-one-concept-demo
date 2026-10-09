"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Boxes, Check, ChartColumn, Flag, Puzzle, ShieldCheck, Target, TriangleAlert, Users } from "lucide-react";
import { Pill, taskStatusLabel } from "@/components/common/badges";
import { EmptyState, Panel } from "@/components/common/layout";
import { PersonAvatar, availabilityLabel } from "@/components/common/person-avatar";
import { employees } from "@/lib/data/people";
import { type S } from "@/lib/selectors";
import { formatDate, relativeDue } from "@/lib/time";
import type { Project, Risk, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "review", "done"];
const severityTone = { high: "danger", medium: "warning", low: "neutral" } as const;

export function OverviewTab({ s, project: p, today }: { s: S; project: Project; today: string }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <About project={p} />
        <Milestones project={p} today={today} />
        <Risks risks={p.risks} />
      </div>
      <div className="space-y-4">
        <TaskStatusChart s={s} project={p} />
        <Panel title="Technologies" icon={Boxes}>
          <ul className="flex flex-wrap gap-1.5">
            {p.technologies.map((t) => (
              <li key={t} className="rounded-md border bg-muted/50 px-2 py-1 text-xs">
                {t}
              </li>
            ))}
          </ul>
        </Panel>
        <KeyPeople project={p} />
      </div>
    </div>
  );
}

function About({ project: p }: { project: Project }) {
  return (
    <Panel title="About this project" icon={Target}>
      <p className="text-sm leading-relaxed text-foreground/90">{p.description}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Objectives</h3>
          <ul className="space-y-2">
            {p.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-sm">
                <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Features</h3>
          <ul className="space-y-2">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <Puzzle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function Milestones({ project: p, today }: { project: Project; today: string }) {
  const milestones = [...p.milestones].sort((a, b) => a.due.localeCompare(b.due));
  const nextId = milestones.find((m) => !m.done)?.id;
  return (
    <Panel title="Milestones" icon={Flag} description={`${milestones.filter((m) => m.done).length} of ${milestones.length} done`}>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones planned yet.</p>
      ) : (
        <ol className="relative ml-2 space-y-4 border-l pl-6">
          {milestones.map((m) => {
            const due = relativeDue(m.due, today);
            const overdue = !m.done && due.tone === "overdue";
            return (
              <li key={m.id} className="relative">
                <span
                  className={cn(
                    "absolute top-0.5 -left-[33px] flex size-4 items-center justify-center rounded-full ring-4 ring-card",
                    m.done ? "bg-success text-white" : overdue ? "bg-danger-soft ring-danger/30" : m.id === nextId ? "border-2 border-primary bg-card" : "border-2 border-border bg-card",
                  )}
                  aria-hidden
                >
                  {m.done && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className={cn("text-sm font-medium", m.done && "text-muted-foreground")}>
                    {m.title}
                    <span className="sr-only">{m.done ? " (done)" : " (open)"}</span>
                  </p>
                  <span className="text-xs text-muted-foreground tabular">{formatDate(m.due, "EEE d MMM")}</span>
                </div>
                <div className="mt-1">
                  {m.done ? (
                    <Pill tone="success">Done</Pill>
                  ) : overdue ? (
                    <Pill tone="danger">{due.label}</Pill>
                  ) : m.id === nextId ? (
                    <Pill tone="primary">Next · {due.label}</Pill>
                  ) : (
                    <span className="text-xs text-muted-foreground">{due.label}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function Risks({ risks }: { risks: Risk[] }) {
  const sorted = [...risks].sort((a, b) => Number(Boolean(b.isBlocker)) - Number(Boolean(a.isBlocker)) || ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity));
  return (
    <Panel title="Risks & blockers" icon={TriangleAlert} description={risks.length ? `${risks.length} open, ${risks.filter((r) => r.isBlocker).length} blocking` : undefined}>
      {sorted.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No open risks" description="Nothing has been logged in the risk register." className="border-0 py-6" />
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((r) => (
            <li key={r.id} className={cn("rounded-lg border p-3", r.isBlocker && "border-danger/30 bg-danger-soft/40")}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone={severityTone[r.severity]}>
                  <span className="capitalize">{r.severity}</span> severity
                </Pill>
                {r.isBlocker && (
                  <Pill tone="danger" icon={TriangleAlert}>
                    Blocker
                  </Pill>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{r.title}</p>
              {r.mitigation ? (
                <p className="mt-1 flex gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground/80">Mitigation:</span> {r.mitigation}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-warning">No mitigation agreed yet.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** One series (task count per status), so a single hue, direct labels and no legend. */
function TaskStatusChart({ s, project: p }: { s: S; project: Project }) {
  const tasks = s.tasks.filter((t) => t.projectId === p.id);
  const data = STATUSES.map((st) => ({ status: taskStatusLabel(st), count: tasks.filter((t) => t.status === st).length }));
  const done = data[3].count;
  const summary = data.map((d) => `${d.count} ${d.status.toLowerCase()}`).join(", ");
  return (
    <Panel title="Task status" icon={ChartColumn} description={tasks.length ? `${tasks.length} tasks · ${Math.round((done / tasks.length) * 100)}% done` : "No tasks yet"}>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create the first task to see the distribution.</p>
      ) : (
        <div className="h-36" role="img" aria-label={`Tasks by status: ${summary}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barCategoryGap={8}>
              <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="status" width={92} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
                formatter={(v) => [`${v} task${Number(v) === 1 ? "" : "s"}`, "Count"]}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={16} minPointSize={2}>
                <LabelList dataKey="count" position="right" fontSize={11} fill="var(--foreground)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function KeyPeople({ project: p }: { project: Project }) {
  const ids = [p.ownerId, ...p.teamIds.filter((id) => id !== p.ownerId)];
  const people = ids.map((id) => employees.find((e) => e.id === id)).filter((e) => e !== undefined);
  return (
    <Panel title="Key people" icon={Users} bodyClassName="p-2">
      <ul>
        {people.map((e) => (
          <li key={e.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <PersonAvatar person={e} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {e.role} · {availabilityLabel[e.availability]}
              </p>
            </div>
            {e.id === p.ownerId && <Pill tone="primary">Owner</Pill>}
            {e.id === p.approverId && e.id !== p.ownerId && <Pill tone="warning">Approver</Pill>}
          </li>
        ))}
      </ul>
      {!ids.includes(p.approverId) && (
        <p className="border-t px-2 pt-2.5 pb-1 text-xs text-muted-foreground">
          Access requests are decided by {employees.find((e) => e.id === p.approverId)?.name}.
        </p>
      )}
    </Panel>
  );
}
