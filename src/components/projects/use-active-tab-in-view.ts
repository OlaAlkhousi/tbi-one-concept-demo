"use client";

import { useEffect, useRef } from "react";

/**
 * For a horizontally scrolling tab list: keeps the active trigger visible, so a deep
 * link such as ?tab=insights on a phone doesn't leave the active tab off-screen.
 * Only scrolls horizontally, never the page.
 */
export function useActiveTabInView<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const scroller = ref.current;
    const active = scroller?.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]');
    if (!scroller || !active) return;
    const a = active.getBoundingClientRect();
    const c = scroller.getBoundingClientRect();
    if (a.right > c.right || a.left < c.left) scroller.scrollLeft += a.left - c.left - 16;
  }, [activeKey]);
  return ref;
}
