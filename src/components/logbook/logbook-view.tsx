"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Lock, NotebookPen, Plus, Printer, Search, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageContext, useS, useToday } from "@/components/common/hooks";
import { AiBadge, EmptyState, PageHeader } from "@/components/common/layout";
import { weekLabel } from "@/components/hours/hours-logic";
import { me } from "@/lib/selectors";
import { formatDate, mondayOf } from "@/lib/time";
import type { ID, LogbookEntry } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { LogbookEditor } from "./logbook-editor";
import { LogbookEntryCard } from "./logbook-entry-card";
import { groupByWeek, visibleLogbook } from "./logbook-logic";
import { WorkSummaryDialog } from "./work-summary-dialog";

/** Printing uses light colours whatever the screen theme, so dark mode doesn't print grey on white. */
const PRINT_LIGHT =
  "print:text-foreground print:[--foreground:oklch(0.2_0.03_265)] print:[--card-foreground:oklch(0.2_0.03_265)] print:[--muted-foreground:oklch(0.42_0.02_262)] print:[--card:#fff] print:[--background:#fff] print:[--border:oklch(0.86_0.008_264)] print:[--muted:oklch(0.96_0.005_264)] print:[--accent:oklch(0.95_0.025_274)] print:[--accent-foreground:oklch(0.38_0.15_274)] print:[--primary:oklch(0.51_0.2_274)] print:[--ai:oklch(0.53_0.2_292)] print:[--ai-soft:oklch(0.955_0.03_292)]";

type Kind = "all" | LogbookEntry["kind"];

export function LogbookView() {
  const s = useS();
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  usePageContext({ kind: "page", label: "Work Logbook" });
  const deleteLogbook = useWorkspace((x) => x.deleteLogbook);
  const user = me(s);
  const thisMonday = mondayOf(today);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [project, setProject] = useState<ID | "all">("all");
  const [editor, setEditor] = useState<{ open: boolean; editId?: ID }>({ open: false });
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<LogbookEntry | null>(null);
  const [highlightId, setHighlightId] = useState<ID | null>(null);

  // Links into this page: ?new=1 opens the editor, ?generate=1 the summary, ?entry=<id> shows an entry.
  const watched = { new: params.get("new"), generate: params.get("generate"), entry: params.get("entry") };
  const [seen, setSeen] = useState<typeof watched>({ new: null, generate: null, entry: null });
  if (watched.new !== seen.new || watched.generate !== seen.generate || watched.entry !== seen.entry) {
    setSeen(watched);
    if (watched.new === "1" && seen.new !== "1") setEditor({ open: true });
    if (watched.generate === "1" && seen.generate !== "1") setGenerating(true);
    if (watched.entry && watched.entry !== seen.entry) {
      setHighlightId(watched.entry);
      setQuery("");
      setKind("all");
      setProject("all");
    }
  }

  useEffect(() => {
    if (!highlightId) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`entry-${highlightId}`)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 3200);
    return () => clearTimeout(t);
  }, [highlightId]);

  function dropParam(name: string) {
    if (!params.has(name)) return;
    const next = new URLSearchParams(params.toString());
    next.delete(name);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const mine = visibleLogbook(s.logbook, s.currentUserId);
  const filtered = visibleLogbook(s.logbook, s.currentUserId, { query, kind, projectId: project });
  const groups = groupByWeek(filtered);
  const filtering = Boolean(query.trim()) || kind !== "all" || project !== "all";
  const projectOptions = s.projects.filter((p) => mine.some((e) => e.projectIds.includes(p.id)));
  const editing = editor.editId ? mine.find((e) => e.id === editor.editId) : undefined;
  const hasThisWeeksReport = mine.some((e) => e.kind === "weekly" && mondayOf(e.date) === thisMonday);

  const clearFilters = () => {
    setQuery("");
    setKind("all");
    setProject("all");
  };
  const openGenerate = () => setGenerating(true);

  return (
    <div className={PRINT_LIGHT}>
      <div className="mb-6 hidden print:block">
        <p className="text-xl font-semibold">Work Logbook · {user.name}</p>
        <p className="text-xs text-muted-foreground">
          {user.role} · printed {formatDate(today, "d MMMM yyyy")} · {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {filtering && " (filtered)"}
        </p>
      </div>

      <div className="no-print">
        <PageHeader
          title="Work Logbook"
          icon={NotebookPen}
          description="Your record of work, challenges and what you learned. Write it yourself or start from a draft of your week."
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> Print / Export PDF
              </Button>
              <Button variant="outline" onClick={() => setEditor({ open: true })} data-testid="new-logbook-entry">
                <Plus /> New entry
              </Button>
              <Button onClick={openGenerate} data-testid="generate-summary" className="bg-gradient-to-r from-primary to-[oklch(0.52_0.2_292)] text-primary-foreground">
                <Wand2 /> Generate My Work Summary
              </Button>
            </>
          }
        />

        <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden /> Private to you. Managers and colleagues can&apos;t read your logbook.
        </p>

        {!hasThisWeeksReport && !filtering && (
          <section className="ai-surface mb-5 flex flex-col gap-3 rounded-xl border p-4 shadow-card sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                No report for {weekLabel(thisMonday).split(" · ")[0].toLowerCase()} yet <AiBadge />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Start from a draft built from your tasks, meetings, GitHub activity, learning and registered hours. You review and edit it before it is saved.</p>
            </div>
            <Button variant="outline" className="bg-card/70" onClick={openGenerate}>
              <Wand2 className="text-ai" /> Draft this week&apos;s report
            </Button>
          </section>
        )}

        {mine.length > 0 && (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles and notes" aria-label="Search your logbook" className="pl-8" data-testid="logbook-search" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="daily">Daily entries</SelectItem>
                <SelectItem value="weekly">Weekly reports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtering && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Your logbook is empty"
          description="Write a short daily entry, or let TBI ONE draft your weekly report from what you recorded."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditor({ open: true })}>
                <Plus /> New entry
              </Button>
              <Button size="sm" onClick={openGenerate}>
                <Wand2 /> Generate My Work Summary
              </Button>
            </div>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState icon={Search} title="No entries match" description="Try another word or clear the filters." action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>} />
      ) : (
        <div className="space-y-8" aria-live="polite">
          {groups.map((g) => (
            <section key={g.monday} aria-labelledby={`week-${g.monday}`} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b pb-2 print:break-after-avoid">
                <h2 id={`week-${g.monday}`} className="text-sm font-semibold">
                  {weekLabel(g.monday)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {g.monday === thisMonday && "This week · "}
                  {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              {g.entries.map((e) => (
                <LogbookEntryCard key={e.id} entry={e} highlighted={highlightId === e.id} onEdit={() => setEditor({ open: true, editId: e.id })} onDelete={() => setDeleting(e)} />
              ))}
            </section>
          ))}
        </div>
      )}

      <LogbookEditor
        open={editor.open}
        editing={editing}
        onClose={() => {
          setEditor({ open: false });
          dropParam("new");
        }}
        onSaved={(id) => {
          setEditor({ open: false });
          clearFilters();
          setHighlightId(id);
          dropParam("new");
        }}
      />
      <WorkSummaryDialog
        open={generating}
        onClose={() => {
          setGenerating(false);
          dropParam("generate");
        }}
        onSaved={(id) => {
          setGenerating(false);
          clearFilters();
          setHighlightId(id);
          dropParam("generate");
        }}
      />
      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>“{deleting?.title}” is removed from your logbook. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete-entry"
              onClick={() => {
                if (!deleting) return;
                deleteLogbook(deleting.id);
                toast("Logbook entry deleted", { description: deleting.title });
                setDeleting(null);
              }}
            >
              <Trash2 /> Delete entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
