"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { documents } from "@/lib/data/catalog";
import { approverFor } from "@/lib/permissions";
import { employeeById } from "@/lib/selectors";
import type { ID, ResourceType } from "@/lib/types";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "./hooks";
import { Field } from "./field";
import { PersonAvatar } from "./person-avatar";

function useResource(type?: ResourceType, id?: ID) {
  const s = useS();
  if (!type || !id) return undefined;
  if (type === "project") {
    const p = s.projects.find((x) => x.id === id);
    return p ? { name: p.name, approverId: approverFor(s, "project", p), ownerId: p.ownerId } : undefined;
  }
  const d = documents.find((x) => x.id === id);
  return d ? { name: d.title, approverId: approverFor(s, "document", d), ownerId: d.ownerId } : undefined;
}

export function AccessRequestDialog() {
  const { accessDialog, closeAccessDialog } = useUi();
  return (
    <Dialog open={accessDialog.open} onOpenChange={(o) => !o && closeAccessDialog()}>
      <DialogContent className="sm:max-w-md">{accessDialog.open && <AccessForm key={accessDialog.resourceId} />}</DialogContent>
    </Dialog>
  );
}

function AccessForm() {
  const { accessDialog, closeAccessDialog } = useUi();
  const requestAccess = useWorkspace((s) => s.requestAccess);
  const resource = useResource(accessDialog.resourceType, accessDialog.resourceId);
  const [reason, setReason] = useState(accessDialog.reason ?? "");
  const [error, setError] = useState<string>();

  if (!resource) return null;
  const approver = employeeById(resource.approverId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("Explain in a sentence why you need access (at least 10 characters).");
      return;
    }
    requestAccess(accessDialog.resourceType!, accessDialog.resourceId!, reason);
    toast.success("Access requested", { description: `${approver?.name} will review your request.` });
    closeAccessDialog();
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>Request access</DialogTitle>
          <DialogDescription>
            to <span className="font-medium text-foreground">{resource.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <PersonAvatar person={approver} size="md" />
            <div className="text-sm">
              <p className="font-medium">{approver?.name}</p>
              <p className="text-xs text-muted-foreground">Decides on access · {approver?.role}</p>
            </div>
          </div>
          <Field id="access-reason" label="Why do you need access?" error={error} hint="Your reason is shown to the approver.">
            <Textarea id="access-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I'm building the facility ticket integration and need the alarm data model." aria-invalid={Boolean(error)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAccessDialog}>
              Cancel
            </Button>
            <Button type="submit">
              <ShieldCheck /> Send request
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}

/** Shown instead of restricted content. Reveals only metadata: name, owner and approver. */
export function RestrictedNotice({ resourceType, resourceId, name, ownerId, approverId }: { resourceType: ResourceType; resourceId: ID; name: string; ownerId: ID; approverId: ID }) {
  const s = useS();
  const openAccessDialog = useUi((u) => u.openAccessDialog);
  const pending = s.accessRequests.find((r) => r.requesterId === s.currentUserId && r.resourceId === resourceId && r.status === "pending");
  const rejected = s.accessRequests.find((r) => r.requesterId === s.currentUserId && r.resourceId === resourceId && r.status === "rejected");
  const owner = employeeById(ownerId);
  const approver = employeeById(approverId);
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center shadow-card" data-testid="restricted-notice">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">This {resourceType} is restricted</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{name}</span> contains confidential information. Only members and people with approved access can see its content.
      </p>
      <dl className="mt-5 grid w-full grid-cols-2 gap-3 text-left text-sm">
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="mt-1 flex items-center gap-2 font-medium">
            <PersonAvatar person={owner} size="xs" /> {owner?.name}
          </dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Approver</dt>
          <dd className="mt-1 flex items-center gap-2 font-medium">
            <PersonAvatar person={approver} size="xs" /> {approver?.name}
          </dd>
        </div>
      </dl>
      {pending ? (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-info-soft px-3 py-1.5 text-sm text-info">
          <Clock className="size-4" aria-hidden /> Request pending with {approver?.firstName}
        </p>
      ) : (
        <>
          {rejected && <p className="mt-5 text-xs text-muted-foreground">An earlier request was declined{rejected.decisionNote ? `: “${rejected.decisionNote}”` : "."}</p>}
          <Button className="mt-6" onClick={() => openAccessDialog(resourceType, resourceId)}>
            <ShieldCheck /> Request access
          </Button>
        </>
      )}
      <p className="mt-6 text-[11px] text-muted-foreground">Simulated permissions. In production, access is enforced server-side with Microsoft Entra ID.</p>
    </div>
  );
}
