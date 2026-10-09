"use client";

import { toast } from "sonner";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoursStatusBadge } from "@/components/common/badges";
import { useS } from "@/components/common/hooks";
import { entryHours, formatHours, totalHours } from "@/lib/hours";
import { formatDate } from "@/lib/time";
import type { HoursEntry, HoursStatus, ID } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";

/** Left edge of each row shows the status at a glance: dashed for drafts, coloured once submitted. */
export const statusEdge: Record<HoursStatus, string> = {
  draft: "border-l-2 border-dashed border-l-muted-foreground/45",
  submitted: "border-l-2 border-l-info",
  approved: "border-l-2 border-l-success",
  rejected: "border-l-2 border-l-danger",
};

export function EntriesTable({ entries, colorFor, managerName, onEdit }: { entries: HoursEntry[]; colorFor: (projectId?: ID) => string; managerName?: string; onEdit: (id: ID) => void }) {
  const s = useS();
  const deleteHours = useWorkspace((x) => x.deleteHours);
  const addHours = useWorkspace((x) => x.addHours);

  function remove(e: HoursEntry) {
    deleteHours(e.id);
    toast("Entry deleted", {
      description: `${formatDate(e.date, "EEE d MMM")} · ${e.description}`,
      action: { label: "Undo", onClick: () => addHours({ date: e.date, start: e.start, end: e.end, breakMinutes: e.breakMinutes, projectId: e.projectId, description: e.description }) },
    });
  }

  const lockReason = (st: HoursStatus) => (st === "approved" ? "Approved. Approved hours can't be changed." : `Submitted. Locked while ${managerName ?? "your manager"} reviews it.`);

  return (
    <Table className="min-w-[760px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4 text-xs text-muted-foreground">Date</TableHead>
          <TableHead className="text-xs text-muted-foreground">Start</TableHead>
          <TableHead className="text-xs text-muted-foreground">End</TableHead>
          <TableHead className="text-right text-xs text-muted-foreground">Break</TableHead>
          <TableHead className="text-xs text-muted-foreground">Project</TableHead>
          <TableHead className="text-xs text-muted-foreground">Description</TableHead>
          <TableHead className="text-right text-xs text-muted-foreground">Hours</TableHead>
          <TableHead className="text-xs text-muted-foreground">Status</TableHead>
          <TableHead className="w-20 pr-4 text-right text-xs text-muted-foreground">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => {
          const project = s.projects.find((p) => p.id === e.projectId);
          const editable = e.status === "draft" || e.status === "rejected";
          return (
            <TableRow key={e.id} data-testid="hours-row" data-status={e.status} className={cn(e.status === "rejected" && "bg-danger-soft/40", e.status === "draft" && "text-foreground/90")}>
              <TableCell className={cn("pl-4 font-medium", statusEdge[e.status])}>{formatDate(e.date, "EEE d MMM")}</TableCell>
              <TableCell className="tabular">{e.start}</TableCell>
              <TableCell className="tabular">{e.end}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular">{e.breakMinutes} min</TableCell>
              <TableCell>
                <span className="inline-flex max-w-[170px] items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: colorFor(e.projectId) }} aria-hidden />
                  <span className="truncate">{project?.name ?? "No project / learning"}</span>
                </span>
              </TableCell>
              <TableCell className="max-w-[240px] truncate text-muted-foreground" title={e.description}>
                {e.description}
              </TableCell>
              <TableCell className="text-right font-semibold tabular">{formatHours(entryHours(e))}</TableCell>
              <TableCell>
                <HoursStatusBadge status={e.status} />
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex justify-end gap-0.5">
                  {editable ? (
                    <>
                      <Button size="icon-xs" variant="ghost" onClick={() => onEdit(e.id)} aria-label={`Edit entry for ${formatDate(e.date, "EEEE d MMMM")}`} data-testid="hours-edit">
                        <Pencil />
                      </Button>
                      {e.status === "draft" && (
                        <Button size="icon-xs" variant="ghost" className="hover:text-danger" onClick={() => remove(e)} aria-label={`Delete entry for ${formatDate(e.date, "EEEE d MMMM")}`} data-testid="hours-delete">
                          <Trash2 />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={lockReason(e.status)}>
                          <Lock className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{lockReason(e.status)}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="pl-4 text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </TableCell>
          <TableCell className="text-right font-semibold tabular">{formatHours(totalHours(entries))}</TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
