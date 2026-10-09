"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, FileText, FolderKanban, Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { employeeById, type S } from "@/lib/selectors";
import type { AccessRequest } from "@/lib/types";
import { useUi } from "@/store/ui";
import { useWorkspace } from "@/store/workspace";
import { Pill } from "@/components/common/badges";
import { Field } from "@/components/common/field";
import { PersonAvatar } from "@/components/common/person-avatar";
import { requestableResources, resourceRef } from "./resources";

/** Decline with an optional note for the requester. */
export function DeclineDialog({ s, request, onClose }: { s: S; request: AccessRequest | null; onClose: () => void }) {
  const decideAccess = useWorkspace((x) => x.decideAccess);
  const [note, setNote] = useState("");
  const requester = employeeById(request?.requesterId);
  const resource = request ? resourceRef(s, request.resourceType, request.resourceId) : undefined;

  function close() {
    setNote("");
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;
    decideAccess(request.id, false, note);
    toast("Request declined", { description: `${requester?.firstName} has been notified${note.trim() ? " with your note" : ""}.` });
    close();
  }

  return (
    <Dialog open={Boolean(request)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline access request</DialogTitle>
          <DialogDescription>
            {requester?.name} asked for access to <span className="font-medium text-foreground">{resource?.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field id="decline-note" label={`Note for ${requester?.firstName ?? "the requester"} (optional)`} hint="Explain why, or where they can find what they need. The note is shown to the requester.">
            <Textarea id="decline-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The data model is shared in the integration guide instead." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" data-testid="confirm-decline">
              <X /> Decline request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lists the restricted projects and documents the user can't open yet, and starts a request. */
export function RequestPicker({ s, open, onOpenChange }: { s: S; open: boolean; onOpenChange: (o: boolean) => void }) {
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const items = requestableResources(s);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request access to…</DialogTitle>
          <DialogDescription>Restricted projects and documents you can&apos;t open yet. You only see their names until access is approved.</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">You already have access to everything restricted in this demo.</p>
        ) : (
          <ul className="scrollbar-thin -mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1" data-testid="requestable-list">
            {items.map((r) => {
              const approver = employeeById(r.approverId);
              const pending = s.accessRequests.some((x) => x.requesterId === s.currentUserId && x.resourceId === r.id && x.status === "pending");
              const TypeIcon = r.type === "project" ? FolderKanban : FileText;
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <Lock className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 capitalize">
                        <TypeIcon className="size-3" aria-hidden /> {r.type} · {r.label}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PersonAvatar person={approver} size="xs" /> Approver: {approver?.name}
                      </span>
                    </p>
                  </div>
                  {pending ? (
                    <Pill tone="info" icon={Clock}>
                      Pending
                    </Pill>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Request access to ${r.name}`}
                      onClick={() => {
                        onOpenChange(false);
                        openAccessDialog(r.type, r.id);
                      }}
                    >
                      <ShieldCheck /> Request
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
