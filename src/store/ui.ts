"use client";

import { create } from "zustand";
import type { ID, ResourceType, TaskDraft } from "@/lib/types";

/** Global, non-persisted dialog state, so any page or the assistant can open them. */
interface UiState {
  taskDialog: { open: boolean; editId?: ID; initial?: Partial<TaskDraft>; onCreated?: (taskId: ID) => void };
  accessDialog: { open: boolean; resourceType?: ResourceType; resourceId?: ID; reason?: string };
  openTaskDialog(opts?: { editId?: ID; initial?: Partial<TaskDraft>; onCreated?: (taskId: ID) => void }): void;
  closeTaskDialog(): void;
  openAccessDialog(resourceType: ResourceType, resourceId: ID, reason?: string): void;
  closeAccessDialog(): void;
}

export const useUi = create<UiState>()((set) => ({
  taskDialog: { open: false },
  accessDialog: { open: false },
  openTaskDialog: (opts) => set({ taskDialog: { open: true, ...opts } }),
  closeTaskDialog: () => set({ taskDialog: { open: false } }),
  openAccessDialog: (resourceType, resourceId, reason) => set({ accessDialog: { open: true, resourceType, resourceId, reason } }),
  closeAccessDialog: () => set({ accessDialog: { open: false } }),
}));
