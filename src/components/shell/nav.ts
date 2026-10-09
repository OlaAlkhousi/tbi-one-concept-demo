import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderKanban,
  GitBranch,
  GraduationCap,
  Home,
  Inbox,
  Newspaper,
  NotebookPen,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PersonaKind } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Personas that see this item in the sidebar. Omitted = everyone. */
  personas?: PersonaKind[];
  badge?: "inbox" | "tasks" | "requests";
}

export const NAV: { section?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/inbox", label: "Inbox", icon: Inbox, badge: "inbox" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/tasks", label: "My Tasks", icon: CheckSquare, badge: "tasks" },
    ],
  },
  {
    section: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/github", label: "GitHub", icon: GitBranch, personas: ["intern", "developer", "lead"] },
      { href: "/knowledge", label: "Knowledge", icon: BookOpen },
      { href: "/people", label: "People", icon: Users },
    ],
  },
  {
    section: "Me",
    items: [
      { href: "/learning", label: "Learning", icon: GraduationCap },
      { href: "/logbook", label: "Work Logbook", icon: NotebookPen, personas: ["intern", "developer"] },
      { href: "/hours", label: "Hours", icon: Clock },
      { href: "/requests", label: "Requests", icon: ShieldCheck, badge: "requests" },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
