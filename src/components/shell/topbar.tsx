"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  FileSearch,
  FlaskConical,
  Menu,
  Monitor,
  Moon,
  NotebookPen,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { employees, DEMO_USER_IDS } from "@/lib/data/people";
import { me, myMeetings, myNotifications } from "@/lib/selectors";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/store/workspace";
import { useUi } from "@/store/ui";
import { useS } from "@/components/common/hooks";
import { KeyHint } from "@/components/common/layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Logo, SidebarNav } from "./sidebar";

const personaBlurb: Record<string, string> = {
  "u-ola": "Intern — development projects, learning, logbook",
  "u-daan": "Developer — repositories, reviews, issues",
  "u-sanne": "Team lead — team, approvals, workload",
  "u-marco": "Project manager — portfolio, risks, decisions",
};

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed border-warning/50 bg-warning-soft px-2.5 text-[11px] font-medium text-warning", className)}>
          <FlaskConical className="size-3" aria-hidden />
          Concept Demo — Fictional Data
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">An independent concept demonstration. All people, projects and messages are fictional. Nothing is connected to real company systems.</TooltipContent>
    </Tooltip>
  );
}

export function UserSwitcher() {
  const s = useS();
  const user = me(s);
  const switchUser = useWorkspace((x) => x.switchUser);
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:pr-2.5" aria-label={`Demo user: ${user.name}. Switch demo user`} data-testid="user-switcher">
          <PersonAvatar person={user} size="sm" showStatus />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-xs font-semibold">{user.firstName}</span>
            <span className="block max-w-32 truncate text-[10px] text-muted-foreground">{user.role}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Demo user switcher</span>
          <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">Simulation</span>
        </DropdownMenuLabel>
        <p className="px-2 pb-2 text-[11px] leading-snug text-muted-foreground">Switch persona to see how TBI ONE adapts. This is not real sign-in; in production identity comes from Microsoft Entra ID.</p>
        <DropdownMenuSeparator />
        {DEMO_USER_IDS.map((id) => {
          const e = employees.find((x) => x.id === id)!;
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                if (id === user.id) return;
                switchUser(id);
                router.push("/");
                toast(`Now viewing as ${e.name}`, { description: e.role });
              }}
              className="items-start gap-3 py-2"
              data-testid={`switch-${id}`}
            >
              <PersonAvatar person={e} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{e.name}</span>
                <span className="block text-xs text-muted-foreground">{personaBlurb[id]}</span>
              </span>
              {id === user.id && <Check className="mt-1 size-4 text-primary" aria-label="Current" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/people?person=${user.id}`}>
            <UserRound /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <RotateCcw /> Settings & reset demo
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Theme">
              <Icon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {(["light", "dark", "system"] as const).map((t) => (
          <DropdownMenuItem key={t} onSelect={() => setTheme(t)}>
            {t === "light" ? <Sun /> : t === "dark" ? <Moon /> : <Monitor />}
            <span className="capitalize">{t}</span>
            {theme === t && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationCenter() {
  const s = useS();
  const router = useRouter();
  const markRead = useWorkspace((x) => x.markNotificationRead);
  const markAll = useWorkspace((x) => x.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const list = myNotifications(s);
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread} unread`} data-testid="notifications">
              <Bell />
              {unread > 0 && <span className="absolute top-1 right-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white tabular">{unread}</span>}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={markAll}>
              Mark all as read
            </button>
          )}
        </div>
        <ul className="scrollbar-thin max-h-[420px] overflow-y-auto">
          {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={cn("flex w-full gap-3 border-b px-4 py-3 text-left transition last:border-0 hover:bg-muted/60", !n.read && "bg-accent/40")}
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  if (n.href) router.push(n.href);
                }}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                  {n.why && (
                    <span className="mt-1.5 flex items-start gap-1 text-[11px] text-ai">
                      <Sparkles className="mt-px size-3 shrink-0" aria-hidden />
                      <span>
                        <span className="font-medium">Why this matters:</span> {n.why}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function QuickActions() {
  const router = useRouter();
  const s = useS();
  const openTaskDialog = useUi((u) => u.openTaskDialog);
  const askAssistant = useWorkspace((x) => x.setAssistantOpen);
  const next = myMeetings(s).find((m) => new Date(m.end) > new Date());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1" data-testid="quick-actions">
          <Plus /> <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => openTaskDialog()}>
          <CheckSquare /> Create task <DropdownMenuShortcut>T</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/hours?new=1")}>
          <Clock /> Register hours
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/logbook?new=1")}>
          <NotebookPen /> Add logbook entry
        </DropdownMenuItem>
        {next && (
          <DropdownMenuItem onSelect={() => router.push(`/calendar/${next.id}`)}>
            <CalendarDays /> Open next meeting
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => router.push("/knowledge?focus=1")}>
          <FileSearch /> Search documents
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => askAssistant(true)}>
          <Sparkles /> Ask AI <DropdownMenuShortcut>Ctrl J</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const setCommandOpen = useWorkspace((x) => x.setCommandOpen);
  const assistantOpen = useWorkspace((x) => x.assistantOpen);
  const setAssistantOpen = useWorkspace((x) => x.setAssistantOpen);
  const [mobileNav, setMobileNav] = useState(false);
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
        <Menu />
      </Button>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center px-4">
            <Logo />
          </div>
          <div className="scrollbar-thin overflow-y-auto px-3 pb-6">
            <SidebarNav onNavigate={() => setMobileNav(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-card transition hover:border-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:max-w-md"
        aria-label="Search everything (Ctrl+K)"
        data-testid="search-trigger"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Search projects, people, docs…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <KeyHint>Ctrl</KeyHint>
          <KeyHint>K</KeyHint>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <DemoBadge className="hidden xl:inline-flex" />
        <QuickActions />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={assistantOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setAssistantOpen(!assistantOpen)}
              aria-label="Toggle TBI ONE Assistant (Ctrl+J)"
              aria-pressed={assistantOpen}
              data-testid="assistant-toggle"
            >
              <Sparkles className="text-ai" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Assistant · Ctrl J</TooltipContent>
        </Tooltip>
        <NotificationCenter />
        <ThemeToggle />
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <UserSwitcher />
      </div>
    </header>
  );
}
