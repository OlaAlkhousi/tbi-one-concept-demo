import { createSeed } from "./data/seed";
import type { S } from "./selectors";
import { zonedISO } from "./time";

/** A fixed Thursday morning in Amsterdam, so tests don't depend on the real date. */
export const NOW = new Date(zonedISO("2026-10-08", "09:00"));

export function stateFor(userId = "u-ola", now = NOW): S {
  return { ...createSeed(now), currentUserId: userId };
}
