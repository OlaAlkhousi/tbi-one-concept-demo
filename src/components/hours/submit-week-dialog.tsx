"use client";

import { toast } from "sonner";
import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/common/person-avatar";
import { formatHours, totalHours } from "@/lib/hours";
import { employeeById } from "@/lib/selectors";
import { formatDate, weekDates } from "@/lib/time";
import type { HoursEntry, ID, ISODate } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { weekLabel } from "./hours-logic";

export function SubmitWeekDialog({ open, onOpenChange, monday, today, entries, managerId }: { open: boolean; onOpenChange: (o: boolean) => void; monday: ISODate; today: ISODate; entries: HoursEntry[]; managerId?: ID }) {
  const submitWeek = useWorkspace((x) => x.submitWeek);
  const manager = employeeById(managerId);
  const toSubmit = entries.filter((e) => e.status === "draft" || e.status === "rejected");
  const total = totalHours(entries);
  const missing = weekDates(monday)
    .slice(0, 5)
    .filter((d) => d <= today && !entries.some((e) => e.date === d));

  function confirm() {
    const n = submitWeek(monday);
    onOpenChange(false);
    toast.success(manager ? `Week submitted to ${manager.name} (simulated)` : "Week submitted (simulated)", {
      description: `${n} ${n === 1 ? "entry" : "entries"} · ${formatHours(total)} h · ${weekLabel(monday)}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit week {formatDate(monday, "I")}?</DialogTitle>
          <DialogDescription>{weekLabel(monday)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total registered</dt>
              <dd className="mt-1 text-lg font-semibold tabular">{formatHours(total)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Entries to submit</dt>
              <dd className="mt-1 text-lg font-semibold tabular">{toSubmit.length}</dd>
            </div>
          </dl>
          {manager ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <PersonAvatar person={manager} size="md" />
              <div className="text-sm">
                <p className="font-medium">{manager.name}</p>
                <p className="text-xs text-muted-foreground">Reviews and approves your hours</p>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">No approver is set up for you, so the week is only marked as submitted.</p>
          )}
          {(missing.length > 0 || total < 40) && (
            <div className="flex gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <div className="space-y-1">
                {total < 40 && <p>You registered {formatHours(total)} of the 40:00 target. You can still submit.</p>}
                {missing.length > 0 && <p>No hours on {missing.map((d) => formatDate(d, "EEE d MMM")).join(", ")}.</p>}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">After submitting, entries are locked until they are approved or returned. This is a simulated submission: nothing leaves the demo.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} data-testid="confirm-submit-week">
            <Send /> Submit week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
