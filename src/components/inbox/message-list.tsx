"use client";

import { CheckCheck, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { EmptyState } from "@/components/common/layout";
import { Pill, SourceIcon } from "@/components/common/badges";
import { timeAgo } from "@/lib/time";
import type { ID, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FILTER_META, senderName, type InboxFilter } from "./inbox-utils";

export function MessageList({
  messages,
  filter,
  query,
  onQuery,
  selectedId,
  onSelect,
  onMarkAllRead,
  className,
}: {
  messages: Message[];
  filter: InboxFilter;
  query: string;
  onQuery: (q: string) => void;
  selectedId: ID | null;
  onSelect: (id: ID) => void;
  onMarkAllRead: () => void;
  className?: string;
}) {
  const unread = messages.filter((m) => !m.read).length;
  const meta = FILTER_META[filter];
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col @2xl/inbox:border-r", className)}>
      <div className="border-b p-2">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search subject, message or sender" aria-label="Search messages" data-testid="inbox-search" />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => onQuery("")} aria-label="Clear search">
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3 text-xs text-muted-foreground">
        <span aria-live="polite" className="truncate">
          {messages.length} message{messages.length === 1 ? "" : "s"}
          {unread > 0 && filter !== "unread" ? ` · ${unread} unread` : ""}
        </span>
        {unread > 0 && (
          <Button size="xs" variant="ghost" onClick={onMarkAllRead}>
            <CheckCheck /> Mark all read
          </Button>
        )}
      </div>
      {messages.length === 0 ? (
        <div className="p-3">
          {query.trim() ? (
            <EmptyState
              icon={SearchX}
              title={`No messages match “${query.trim()}”`}
              description={`Searched ${meta.label.toLowerCase()} messages by subject, text and sender.`}
              action={
                <Button size="sm" variant="outline" onClick={() => onQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState icon={meta.icon} title={meta.empty.title} description={meta.empty.description} />
          )}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label={`${meta.label} messages`}>
          {messages.map((m) => (
            <li key={m.id}>
              <MessageRow message={m} selected={m.id === selectedId} onSelect={() => onSelect(m.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageRow({ message: m, selected, onSelect }: { message: Message; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      data-testid="message-row"
      data-message-id={m.id}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "relative flex w-full gap-3 border-b px-4 py-3 text-left transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        selected ? "bg-accent/70" : "hover:bg-muted/60",
      )}
    >
      {!m.read && (
        <span className="absolute top-[1.35rem] left-1.5 size-1.5 rounded-full bg-primary">
          <span className="sr-only">Unread.</span>
        </span>
      )}
      <SourceIcon source={m.channel} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", m.read ? "text-foreground/85" : "font-semibold")}>{senderName(m)}</span>
          <time dateTime={m.receivedAt} className="shrink-0 text-[11px] text-muted-foreground tabular">
            {timeAgo(m.receivedAt)}
          </time>
        </span>
        <span className={cn("block truncate text-[13px]", m.read ? "text-foreground/80" : "font-medium")}>{m.subject}</span>
        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.body}</span>
        {(m.important || m.needsAction || m.replies.length > 0) && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {m.needsAction && <Pill tone="danger">Needs action</Pill>}
            {m.important && <Pill tone="warning">Important</Pill>}
            {m.replies.length > 0 && <Pill tone="info">Replied (simulated)</Pill>}
          </span>
        )}
      </span>
    </button>
  );
}
