"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderKanban,
  GitBranch,
  Lock,
  NotebookPen,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { search, type SearchGroup } from "@/lib/search";
import { me } from "@/lib/selectors";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "@/components/common/hooks";
import { ALL_NAV } from "./nav";

const groupIcon: Record<SearchGroup, LucideIcon> = {
  Projects: FolderKanban,
  People: UserRound,
  Tasks: CheckSquare,
  Meetings: CalendarDays,
  Documents: BookOpen,
  "GitHub issues": GitBranch,
  Logbook: NotebookPen,
};

/** Ctrl/Cmd+K: permission-aware search across every module, plus quick actions. */
export function CommandPalette() {
  const open = useWorkspace((s) => s.commandOpen);
  const setOpen = useWorkspace((s) => s.setCommandOpen);
  const askAssistant = useWorkspace((s) => s.askAssistant);
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const router = useRouter();
  const s = useS();
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim().length >= 2 ? search(s, query) : []), [s, query]);
  const persona = me(s).persona;

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  };

  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <CommandDialog open={open} onOpenChange={(o) => (setOpen(o), o ? null : setQuery(""))} title="Search TBI ONE" description="Search projects, people, tasks, meetings, documents and issues" className="sm:max-w-xl">
      <Command shouldFilter={false} label="Search TBI ONE">
        <CommandInput placeholder="Search or type a command…" value={query} onValueChange={setQuery} data-testid="command-input" />
        <CommandList className="max-h-[min(460px,60vh)]">
          {query.trim().length >= 2 && (
            <CommandGroup heading="Assistant">
              <CommandItem value={`ask ${query}`} onSelect={() => run(() => askAssistant(query))}>
                <Sparkles className="text-ai" />
                Ask the assistant: <span className="truncate font-medium">“{query}”</span>
              </CommandItem>
            </CommandGroup>
          )}
          {groups.map((g) => {
            const Icon = groupIcon[g];
            return (
              <CommandGroup key={g} heading={g}>
                {results
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <CommandItem key={`${g}-${r.id}`} value={`${g}-${r.id}`} onSelect={() => go(r.href)} data-testid="search-result">
                      {r.locked ? <Lock className="text-warning" /> : <Icon />}
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="max-w-[45%] truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            );
          })}
          {query.trim().length >= 2 && results.length === 0 && <CommandEmpty>No results you have access to. Try the assistant.</CommandEmpty>}
          {query.trim().length < 2 && (
            <>
              <CommandGroup heading="Quick actions">
                <CommandItem value="new-task" onSelect={() => run(() => openTaskDialog())}>
                  <CheckSquare /> New task
                </CommandItem>
                <CommandItem value="assistant" onSelect={() => run(() => askAssistant(""))}>
                  <Sparkles className="text-ai" /> Open AI assistant <CommandShortcut>Ctrl J</CommandShortcut>
                </CommandItem>
                <CommandItem value="hours" onSelect={() => go("/hours?new=1")}>
                  <Clock /> Register hours
                </CommandItem>
                {(persona === "intern" || persona === "developer") && (
                  <CommandItem value="logbook" onSelect={() => go("/logbook?new=1")}>
                    <NotebookPen /> Create logbook entry
                  </CommandItem>
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                {ALL_NAV.map((n) => (
                  <CommandItem key={n.href} value={`nav-${n.href}`} onSelect={() => go(n.href)}>
                    <n.icon /> {n.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
