import { me, type S } from "@/lib/selectors";
import type { AssistantMessage, ID } from "@/lib/types";

/**
 * The current demo user's own records, for "Export my demo data".
 * Deliberately not the whole persisted state: that also holds the other personas'
 * messages, hours, logbooks and conversations, which a manager must not get either.
 */
export function exportMyData(s: S & { conversations?: Record<ID, AssistantMessage[]> }, now: Date) {
  const u = s.currentUserId;
  const user = me(s);
  return {
    about: "TBI ONE concept demo export. All data is fictional and was stored only in this browser.",
    exportedAt: now.toISOString(),
    user: { id: user.id, name: user.name, role: user.role },
    tasks: s.tasks.filter((t) => t.assigneeId === u || t.creatorId === u),
    messages: s.messages.filter((m) => m.recipientId === u),
    hours: s.hours.filter((h) => h.userId === u),
    logbook: s.logbook.filter((l) => l.userId === u),
    learning: s.learning.find((l) => l.userId === u) ?? null,
    accessRequests: s.accessRequests.filter((r) => r.requesterId === u || r.approverId === u),
    accessGrants: s.accessGrants.filter((g) => g.userId === u || g.grantedBy === u),
    notifications: s.notifications.filter((n) => n.userId === u),
    bookmarks: s.bookmarks[u] ?? [],
    dashboardLayout: s.layouts[u] ?? null,
    assistantConversation: s.conversations?.[u] ?? [],
  };
}
