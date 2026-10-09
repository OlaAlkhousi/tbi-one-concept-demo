"use client";

import { useEffect, useMemo } from "react";
import { useWorkspace, type PageContext } from "@/store/workspace";
import type { S } from "@/lib/selectors";
import { toISODate } from "@/lib/time";

/**
 * The whole workspace state, typed for the pure selector functions in lib/selectors.
 * Re-renders on any state change, which is fine for a local demo of this size.
 */
export function useS(): S {
  return useWorkspace() as unknown as S;
}

/** Today's date in Europe/Amsterdam. */
export function useToday(): string {
  return useMemo(() => toISODate(), []);
}

/** Tells the assistant what the user is looking at ("this project", "this meeting"). */
export function usePageContext(ctx: PageContext | null) {
  const setPageContext = useWorkspace((s) => s.setPageContext);
  const key = ctx ? `${ctx.kind}:${ctx.id ?? ""}:${ctx.label}` : "";
  useEffect(() => {
    setPageContext(ctx);
    return () => setPageContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPageContext]);
}
