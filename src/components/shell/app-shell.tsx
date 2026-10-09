"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { mondayOf, toISODate } from "@/lib/time";
import { useWorkspace } from "@/store/workspace";
import { TaskDialog } from "@/components/common/task-dialog";
import { AccessRequestDialog } from "@/components/common/access";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1280px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1280px)").matches,
    () => true,
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-flex size-10 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.17_274)] to-[oklch(0.5_0.2_292)] text-sm font-bold text-white">1</span>
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </div>
    </div>
  );
}

/** Demo data is generated relative to the day it was created; offer a refresh when it gets old. */
function StaleDataBanner() {
  const seededAt = useWorkspace((s) => s.seededAt);
  const resetDemo = useWorkspace((s) => s.resetDemo);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || mondayOf(toISODate(new Date(seededAt))) === mondayOf(toISODate())) return null;
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-2 border-b bg-info-soft px-4 py-1.5 text-xs text-info">
      The demo data was generated on {new Date(seededAt).toLocaleDateString("en-GB", { timeZone: "Europe/Amsterdam" })}, so dates may look old.
      <Button
        size="xs"
        variant="outline"
        onClick={() => {
          resetDemo();
          toast.success("Demo data refreshed for this week");
        }}
      >
        <RotateCcw /> Refresh demo data
      </Button>
      <button type="button" className="underline-offset-2 hover:underline" onClick={() => setDismissed(true)}>
        Keep my changes
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const assistantOpen = useWorkspace((s) => s.assistantOpen);
  const setAssistantOpen = useWorkspace((s) => s.setAssistantOpen);
  const setCommandOpen = useWorkspace((s) => s.setCommandOpen);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // State lives in localStorage; load it on the client only to avoid hydration mismatches.
    void Promise.resolve(useWorkspace.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistantOpen(!useWorkspace.getState().assistantOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAssistantOpen, setCommandOpen]);

  if (!hydrated) return <LoadingShell />;

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <StaleDataBanner />
        <div className="flex min-h-0 flex-1">
          <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            <footer className="no-print mx-auto mt-10 w-full max-w-[1400px] border-t pt-4 text-[11px] text-muted-foreground">
              <span className="font-medium text-warning">Concept demo, fictional data.</span> TBI ONE is an independent student concept, not an official TBI product. It is not connected to any company system.
            </footer>
          </main>
          {isDesktop && assistantOpen && (
            <aside className="no-print sticky top-14 h-[calc(100dvh-3.5rem)] w-[400px] shrink-0 border-l bg-card animate-in slide-in-from-right-4 fade-in" aria-label="TBI ONE Assistant">
              <AssistantChat onClose={() => setAssistantOpen(false)} />
            </aside>
          )}
        </div>
      </div>
      {!isDesktop && (
        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetContent side="right" className="p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md" showCloseButton={false}>
            <SheetTitle className="sr-only">TBI ONE Assistant</SheetTitle>
            <AssistantChat onClose={() => setAssistantOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <CommandPalette />
      <TaskDialog />
      <AccessRequestDialog />
    </div>
  );
}
