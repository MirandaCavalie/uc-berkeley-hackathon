"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultRoi } from "./engine/opportunities";
import { blankInterview, seedInterviews, seedWorkspace } from "./seed-interviews";
import type { Analysis, Interview, RoiAssumptions, Solution, Workspace } from "./types";

interface State {
  workspace: Workspace;
  interviews: Interview[];
  roi: RoiAssumptions;
  analysis: Analysis | null;
  /** Solution types a person chose over Jev's, keyed by opportunity id. */
  overrides: Record<string, Solution>;

  setWorkspace: (patch: Partial<Workspace>) => void;
  inviteInterview: (p: { name: string; role: string; team: string }) => string;
  saveInterview: (iv: Interview) => void;
  removeInterview: (id: string) => void;
  setRoi: (patch: Partial<RoiAssumptions>) => void;
  setAnalysis: (a: Analysis) => void;
  override: (id: string, solution: Solution | null) => void;
  resetDemo: () => void;
  clearWorkspace: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const initial = () => ({
  workspace: seedWorkspace,
  interviews: seedInterviews,
  roi: defaultRoi,
  analysis: null,
  overrides: {},
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial(),

      setWorkspace: (patch) => set((s) => ({ workspace: { ...s.workspace, ...patch } })),
      inviteInterview: ({ name, role, team }) => {
        const id = `iv-${uid()}`;
        set((s) => ({ interviews: [...s.interviews, blankInterview(id, name, role, team, now())] }));
        return id;
      },
      saveInterview: (iv) => set((s) => ({ interviews: s.interviews.map((x) => (x.id === iv.id ? iv : x)) })),
      removeInterview: (id) => set((s) => ({ interviews: s.interviews.filter((x) => x.id !== id) })),
      setRoi: (patch) => set((s) => ({ roi: { ...s.roi, ...patch } })),
      setAnalysis: (analysis) => set({ analysis }),
      override: (id, solution) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (solution) overrides[id] = solution;
          else delete overrides[id];
          return { overrides };
        }),
      resetDemo: () => set(initial()),
      clearWorkspace: () =>
        set({ ...initial(), workspace: { company: "Your company", industry: "", employees: "", synthetic: false, teamRoster: [] }, interviews: [] }),
    }),
    { name: "fieldwork", version: 1, skipHydration: true },
  ),
);

/** False until saved state has loaded, so pages don't flash the seed data first. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
