import { repositories } from "../data/catalog";
import { employees } from "../data/people";
import { canViewDocument, canViewMeeting, canViewRepo } from "../permissions";
import { visibleDocuments, type S } from "../selectors";
import type { Employee, GithubIssue, ID, IssueDraft, KnowledgeDocument, Meeting, Message, PullRequest, Repository } from "../types";

/**
 * Integration seam.
 *
 * Each external system TBI ONE would talk to is described by a small provider
 * interface. The demo ships mock providers that read the local demo state. A real
 * deployment would add server-side implementations (Microsoft Graph, GitHub API, …)
 * behind the same interfaces, selected per environment, without changing the UI.
 *
 * Rules every real provider must follow:
 *  - Act on behalf of the signed-in user (delegated permissions), never with a broad
 *    service account, so the source system's own permissions keep applying.
 *  - Run on the server. Tokens and secrets never reach the browser.
 *  - Write actions (send mail, create issue) only after explicit user confirmation.
 */

export interface UserContext {
  userId: ID;
}

export interface DirectoryProvider {
  /** Microsoft Entra ID / Graph `/users` in production. */
  listPeople(ctx: UserContext): Promise<Employee[]>;
}

export interface MailProvider {
  /** Graph `/me/messages` and Teams chats in production. */
  listMessages(ctx: UserContext): Promise<Message[]>;
  /** Production: Graph `sendMail` / chat message. The demo never sends anything. */
  sendReply(ctx: UserContext, messageId: ID, body: string): Promise<{ sent: false; reason: string }>;
}

export interface CalendarProvider {
  /** Graph `/me/calendarView` + approved meeting insights in production. */
  listMeetings(ctx: UserContext): Promise<Meeting[]>;
}

export interface KnowledgeProvider {
  /** SharePoint search via Graph with the user's own permissions in production. */
  searchDocuments(ctx: UserContext, query: string): Promise<KnowledgeDocument[]>;
}

export interface CodeHostProvider {
  /** GitHub REST/GraphQL via a GitHub App installation in production. */
  listRepositories(ctx: UserContext): Promise<Repository[]>;
  listIssues(ctx: UserContext): Promise<GithubIssue[]>;
  listPullRequests(ctx: UserContext): Promise<PullRequest[]>;
  createIssue(ctx: UserContext, draft: IssueDraft): Promise<GithubIssue>;
}

export interface Providers {
  directory: DirectoryProvider;
  mail: MailProvider;
  calendar: CalendarProvider;
  knowledge: KnowledgeProvider;
  code: CodeHostProvider;
}

/** Mock providers backed by the demo state. `getState` returns the current store snapshot. */
export function createMockProviders(getState: () => S, createIssue: (d: IssueDraft) => GithubIssue): Providers {
  const as = (ctx: UserContext): S => ({ ...getState(), currentUserId: ctx.userId });
  return {
    directory: { listPeople: async () => employees },
    mail: {
      listMessages: async (ctx) => as(ctx).messages.filter((m) => m.recipientId === ctx.userId),
      sendReply: async () => ({ sent: false, reason: "Demo mode: messages are simulated and never sent." }),
    },
    calendar: { listMeetings: async (ctx) => as(ctx).meetings.filter((m) => canViewMeeting(as(ctx), ctx.userId, m)) },
    knowledge: {
      searchDocuments: async (ctx, query) => {
        const q = query.toLowerCase();
        return visibleDocuments(as(ctx)).filter((d) => canViewDocument(as(ctx), ctx.userId, d) && `${d.title} ${d.summary} ${d.tags.join(" ")}`.toLowerCase().includes(q));
      },
    },
    code: {
      listRepositories: async (ctx) => repositories.filter((r) => canViewRepo(as(ctx), ctx.userId, r)),
      listIssues: async (ctx) => as(ctx).issues.filter((i) => canViewRepo(as(ctx), ctx.userId, repositories.find((r) => r.id === i.repoId)!)),
      listPullRequests: async (ctx) => as(ctx).pullRequests.filter((p) => canViewRepo(as(ctx), ctx.userId, repositories.find((r) => r.id === p.repoId)!)),
      createIssue: async (_ctx, draft) => createIssue(draft),
    },
  };
}

/**
 * Placeholder for a production provider. Kept here so the shape of a real
 * integration is visible; it deliberately refuses to run in this demo.
 */
export class NotConfiguredError extends Error {
  constructor(system: string) {
    super(`${system} is not connected in this concept demo. A real integration needs organisational approval, an app registration and server-side credentials.`);
  }
}

export const graphProviderStub: Pick<Providers, "mail" | "calendar"> = {
  mail: {
    listMessages: async () => {
      throw new NotConfiguredError("Microsoft Graph (mail)");
    },
    sendReply: async () => {
      throw new NotConfiguredError("Microsoft Graph (mail)");
    },
  },
  calendar: {
    listMeetings: async () => {
      throw new NotConfiguredError("Microsoft Graph (calendar)");
    },
  },
};
