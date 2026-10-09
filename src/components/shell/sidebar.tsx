"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { me, myMessages, myOpenTasks, pendingApprovals } from "@/lib/selectors";
import { useWorkspace } from "@/store/workspace";
import { useS } from "@/components/common/hooks";
import { NAV, isActive, type NavItem } from "./nav";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none" aria-label="TBI ONE home">
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.62_0.17_274)] to-[oklch(0.5_0.2_292)] text-[13px] font-bold tracking-tight text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset]">
        1
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-sidebar-accent-foreground">TBI ONE</span>
          <span className="block text-[11px] text-sidebar-muted">Your intelligent workspace</span>
        </span>
      )}
    </Link>
  );
}

function useBadges() {
  const s = useS();
  const unread = myMessages(s).filter((m) => !m.read && !m.archived).length;
  const tasks = myOpenTasks(s).length;
  const approvals = pendingApprovals(s).length;
  return { inbox: unread, tasks, requests: approvals };
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const s = useS();
  const persona = me(s).persona;
  const badges = useBadges();
  const askAssistant = useWorkspace((x) => x.setAssistantOpen);

  const item = (it: NavItem) => {
    const active = isActive(pathname, it.href);
    const count = it.badge ? badges[it.badge] : 0;
    const link = (
      <Link
        key={it.href}
        href={it.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
          active && "bg-sidebar-accent text-sidebar-accent-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" aria-hidden />}
        <it.icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-accent-foreground")} aria-hidden />
        {!collapsed && <span className="truncate">{it.label}</span>}
        {count > 0 && (
          <span
            className={cn(
              "ml-auto inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular",
              it.badge === "requests" ? "bg-warning text-black/80" : "bg-sidebar-primary/20 text-sidebar-primary",
              collapsed && "absolute -top-0.5 -right-0.5 ml-0 h-4 min-w-4",
            )}
            aria-label={`${count} ${it.badge === "inbox" ? "unread" : it.badge === "tasks" ? "open" : "pending"}`}
          >
            {count}
          </span>
        )}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={it.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{it.label}</TooltipContent>
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => !i.personas || (persona && i.personas.includes(persona)));
        return (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.section && !collapsed && <p className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-sidebar-muted/80 uppercase">{group.section}</p>}
            {items.map(item)}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => askAssistant(true)}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-lg border border-sidebar-border bg-gradient-to-r from-[oklch(0.62_0.17_274/0.18)] to-[oklch(0.55_0.2_292/0.18)] px-2.5 text-[13px] font-medium text-sidebar-accent-foreground transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
          collapsed && "justify-center px-0",
        )}
        aria-label="Open TBI ONE Assistant"
      >
        <Sparkles className="size-4 text-[oklch(0.8_0.12_292)]" aria-hidden />
        {!collapsed && <span>Ask the assistant</span>}
      </button>
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useWorkspace((s) => s.sidebarCollapsed);
  const toggle = useWorkspace((s) => s.toggleSidebar);
  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-[60px]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center px-3.5", collapsed && "justify-center px-0")}>
        <Logo collapsed={collapsed} />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-3">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className={cn("border-t border-sidebar-border p-2.5", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-sidebar-muted transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="mx-auto size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
