"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, MailQuestion, MousePointerClick, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageContext, useS } from "@/components/common/hooks";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { myMessages } from "@/lib/selectors";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { FilterNav } from "./filter-nav";
import { MessageDetail } from "./message-detail";
import { MessageList } from "./message-list";
import { INBOX_FILTERS, isInboxFilter, matchesFilter, matchesSearch, type InboxFilter } from "./inbox-utils";

/** Unified inbox. URL: ?filter=<key> preselects a filter, ?m=<id> opens (and reads) a message. */
export function InboxView() {
  const s = useS();
  const router = useRouter();
  const params = useSearchParams();
  const rawFilter = params.get("filter");
  const filter: InboxFilter = isInboxFilter(rawFilter) ? rawFilter : "all";
  const selectedId = params.get("m");
  const [query, setQuery] = useState("");
  const markRead = useWorkspace((x) => x.markMessageRead);

  // Only the current user's own messages, ever.
  const mine = myMessages(s);
  const selected = selectedId ? mine.find((m) => m.id === selectedId) : undefined;
  const visible = mine.filter((m) => matchesFilter(m, filter) && matchesSearch(m, query));
  const counts = Object.fromEntries(INBOX_FILTERS.map((f) => [f, mine.filter((m) => matchesFilter(m, f)).length])) as Record<InboxFilter, number>;
  const unread = counts.unread;

  usePageContext(selected ? { kind: "message", id: selected.id, label: selected.subject } : { kind: "page", label: "Inbox" });

  // Opening a message marks it read once; "Mark as unread" afterwards is respected.
  useEffect(() => {
    if (!selectedId) return;
    const st = useWorkspace.getState();
    const m = st.messages.find((x) => x.id === selectedId);
    if (m && m.recipientId === st.currentUserId && !m.read) markRead(selectedId, true);
  }, [selectedId, markRead]);

  function go(next: { m?: ID | null; filter?: InboxFilter }) {
    const p = new URLSearchParams();
    const f = next.filter ?? filter;
    const m = next.m === undefined ? selectedId : next.m;
    if (f !== "all") p.set("filter", f);
    if (m) p.set("m", m);
    const qs = p.toString();
    router.replace(qs ? `/inbox?${qs}` : "/inbox", { scroll: false });
  }

  function markAllRead() {
    const ids = visible.filter((m) => !m.read).map((m) => m.id);
    ids.forEach((id) => markRead(id, true));
    toast.success(`Marked ${ids.length} message${ids.length === 1 ? "" : "s"} as read`, {
      action: { label: "Undo", onClick: () => ids.forEach((id) => markRead(id, false)) },
    });
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        icon={Inbox}
        description={
          <>
            Teams, Outlook, GitHub, project updates and meeting follow-ups in one place. {unread > 0 ? `${unread} unread.` : "All read."} Everything here is simulated: nothing is sent or received.
          </>
        }
        actions={
          <Button size="sm" variant="outline" onClick={() => useWorkspace.getState().askAssistant("Which messages need my attention?")}>
            <Sparkles className="text-ai" /> What needs my attention?
          </Button>
        }
      />
      <div className="@container/inbox">
        <div
          className={cn(
            "grid grid-cols-1 overflow-hidden rounded-xl border bg-card shadow-card",
            "@2xl/inbox:h-[calc(100dvh-13rem)] @2xl/inbox:min-h-[540px] @2xl/inbox:grid-cols-[300px_minmax(0,1fr)] @2xl/inbox:grid-rows-[auto_minmax(0,1fr)]",
            "@5xl/inbox:grid-cols-[208px_340px_minmax(0,1fr)] @5xl/inbox:grid-rows-[minmax(0,1fr)]",
          )}
        >
          <FilterNav
            active={filter}
            counts={counts}
            onChange={(f) => go({ filter: f })}
            className={cn("@2xl/inbox:col-span-2 @5xl/inbox:col-span-1", selectedId && "hidden @2xl/inbox:flex")}
          />
          <MessageList
            messages={visible}
            filter={filter}
            query={query}
            onQuery={setQuery}
            selectedId={selectedId}
            onSelect={(id) => go({ m: id })}
            onMarkAllRead={markAllRead}
            className={cn(selectedId && "hidden @2xl/inbox:flex")}
          />
          <div className={cn("min-h-0 min-w-0 flex-col", selectedId ? "flex" : "hidden @2xl/inbox:flex")}>
            {selected ? (
              <MessageDetail key={selected.id} message={selected} onBack={() => go({ m: null })} />
            ) : selectedId ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  icon={MailQuestion}
                  title="Message not available"
                  description="It may have been removed, or it belongs to another person's inbox. You only ever see your own messages."
                  action={
                    <Button size="sm" variant="outline" onClick={() => go({ m: null })}>
                      Back to inbox
                    </Button>
                  }
                  className="w-full max-w-md"
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  icon={MousePointerClick}
                  title="Select a message"
                  description="Read it here, turn it into a task, or draft a simulated reply."
                  className="w-full max-w-md border-0"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
