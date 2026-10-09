import { documents } from "@/lib/data/catalog";
import { approverFor, canViewDocument, canViewProject } from "@/lib/permissions";
import type { S } from "@/lib/selectors";
import type { ID, ResourceType } from "@/lib/types";

export interface ResourceRef {
  type: ResourceType;
  id: ID;
  /** Title only: safe to show for restricted resources. */
  name: string;
  /** Project code or document category. */
  label: string;
  approverId: ID;
  ownerId: ID;
}

export function resourceHref(type: ResourceType, id: ID): string {
  return type === "project" ? `/projects/${id}` : `/knowledge?doc=${id}`;
}

export function resourceRef(s: S, type: ResourceType, id: ID): ResourceRef | undefined {
  if (type === "project") {
    const p = s.projects.find((x) => x.id === id);
    return p && { type, id, name: p.name, label: p.code, approverId: approverFor(s, "project", p), ownerId: p.ownerId };
  }
  const d = documents.find((x) => x.id === id);
  return d && { type, id, name: d.title, label: d.category, approverId: approverFor(s, "document", d), ownerId: d.ownerId };
}

export function canOpen(s: S, type: ResourceType, id: ID): boolean {
  if (type === "project") {
    const p = s.projects.find((x) => x.id === id);
    return p ? canViewProject(s, s.currentUserId, p) : false;
  }
  const d = documents.find((x) => x.id === id);
  return d ? canViewDocument(s, s.currentUserId, d) : false;
}

/** Restricted projects and documents the current user cannot open yet. */
export function requestableResources(s: S): ResourceRef[] {
  const projects = s.projects.filter((p) => p.visibility === "restricted" && !canViewProject(s, s.currentUserId, p)).map((p) => resourceRef(s, "project", p.id)!);
  const docs = documents.filter((d) => d.visibility === "restricted" && !canViewDocument(s, s.currentUserId, d)).map((d) => resourceRef(s, "document", d.id)!);
  return [...projects, ...docs];
}
