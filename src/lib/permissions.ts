import type { SeedData } from "./data/seed";
import type { AccessGrant, ID, KnowledgeDocument, Meeting, Project, Repository, ResourceType } from "./types";
import { employees } from "./data/people";

/**
 * Simulated permission model.
 *
 * IMPORTANT: this runs in the browser, so it is a demonstration of *behaviour*, not
 * security. In production these checks belong on the server (backed by Microsoft
 * Entra ID groups and the source systems' own permissions), and restricted content
 * would never be sent to the browser in the first place.
 *
 * Rules:
 *  - Internal projects/documents: everyone can see them.
 *  - Restricted projects: team members, plus anyone with an approved access grant.
 *  - Restricted documents: explicit readers, members of a linked project, or a grant.
 *  - Being a manager does NOT give automatic access to restricted content, and nobody
 *    can read another person's inbox, logbook or assistant conversation.
 */

type PermState = Pick<SeedData, "projects" | "accessGrants">;

function hasGrant(grants: AccessGrant[], userId: ID, type: ResourceType, id: ID): boolean {
  return grants.some((g) => g.userId === userId && g.resourceType === type && g.resourceId === id);
}

export function canViewProject(state: PermState, userId: ID, project: Project): boolean {
  if (project.visibility === "internal") return true;
  if (project.teamIds.includes(userId)) return true;
  return hasGrant(state.accessGrants, userId, "project", project.id);
}

export function canViewProjectId(state: PermState, userId: ID, projectId: ID | undefined): boolean {
  if (!projectId) return true;
  const p = state.projects.find((x) => x.id === projectId);
  return p ? canViewProject(state, userId, p) : false;
}

export function canViewDocument(state: PermState, userId: ID, doc: KnowledgeDocument): boolean {
  if (doc.visibility === "internal") return true;
  if (doc.allowedUserIds?.includes(userId)) return true;
  if (hasGrant(state.accessGrants, userId, "document", doc.id)) return true;
  return doc.projectIds.some((pid) => {
    const p = state.projects.find((x) => x.id === pid);
    return p ? p.teamIds.includes(userId) || hasGrant(state.accessGrants, userId, "project", pid) : false;
  });
}

export function canViewRepo(state: PermState, userId: ID, repo: Repository): boolean {
  if (repo.visibility === "internal") return true;
  return canViewProjectId(state, userId, repo.projectId);
}

/**
 * Meetings: participants always; otherwise only project meetings of projects you can see.
 * Meetings without a project (1:1s, check-ins) are private to their participants.
 */
export function canViewMeeting(state: PermState, userId: ID, meeting: Meeting): boolean {
  if (meeting.participantIds.includes(userId)) return true;
  if (!meeting.projectId) return false;
  return canViewProjectId(state, userId, meeting.projectId);
}

/** Who decides on an access request for a resource. */
export function approverFor(state: Pick<SeedData, "projects">, type: ResourceType, resource: Project | KnowledgeDocument): ID {
  if (type === "project") return (resource as Project).approverId;
  const doc = resource as KnowledgeDocument;
  const linked = state.projects.find((p) => doc.projectIds.includes(p.id));
  return linked?.approverId ?? doc.ownerId;
}

export function isApprover(userId: ID): boolean {
  return Boolean(employees.find((e) => e.id === userId)?.approves);
}

/** Team members whose timesheets this user approves. */
export function approvesHoursFor(userId: ID): ID[] {
  return employees.find((e) => e.id === userId)?.approves?.teamMemberIds ?? [];
}
