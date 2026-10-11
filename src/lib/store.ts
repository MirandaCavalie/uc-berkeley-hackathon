"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultRoi } from "./engine/opportunities";
import { blankInterview, seedInterviews, seedWorkspace } from "./seed-interviews";
import type { Analysis, Interview, RoiAssumptions, Solution, Workspace } from "./types";
import type { HelperDraft, PersonalHelper, HelperRun } from "./personal/types";

interface State {
  workspace: Workspace;
  interviews: Interview[];
  roi: RoiAssumptions;
  analysis: Analysis | null;
  /** Solution types a person chose over Jev's, keyed by opportunity id. */
  overrides: Record<string, Solution>;
  personalHelpers: PersonalHelper[];
  helperDrafts: Record<string, HelperDraft>;
  /** App ids each employee connected on My work, keyed by interview id. */
  connectedApps: Record<string, string[]>;
  toggleApp: (interviewId: string, appId: string, connected: boolean) => void;
  saveHelperDraft: (interviewId: string, draft: HelperDraft | null) => void;
  savePersonalHelper: (helper: PersonalHelper) => void;
  removePersonalHelper: (id: string) => void;
  reviewHelperRun: (helperId: string, runId: string, review: Pick<HelperRun, "feedback" | "minutesSaved">) => void;

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

function withRoiDefaults(roi?: Partial<RoiAssumptions>): RoiAssumptions {
  return {
    ...defaultRoi,
    ...roi,
    capture: { ...defaultRoi.capture, ...roi?.capture },
    runCost: { ...defaultRoi.runCost, ...roi?.runCost },
    adoptionCeilings: roi?.adoptionCeilings?.length === 5 ? roi.adoptionCeilings : defaultRoi.adoptionCeilings,
  };
}

/** v1 saved `roi` without builderRate, adoptionCeilings and runCost; the default persist merge is shallow. */
export function migratePersisted(persisted: unknown) {
  const saved = persisted as { roi?: Partial<RoiAssumptions> } | undefined;
  return { ...saved, roi: withRoiDefaults(saved?.roi) };
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const initial = () => ({
  workspace: seedWorkspace,
  interviews: seedInterviews,
  roi: defaultRoi,
  analysis: null,
  overrides: {},
  personalHelpers: [] as PersonalHelper[],
  helperDrafts: {} as Record<string, HelperDraft>,
  connectedApps: {} as Record<string, string[]>,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial(),
      toggleApp: (interviewId, appId, connected) => set((s) => {
        const current = (s.connectedApps[interviewId] ?? []).filter((id) => id !== appId);
        return { connectedApps: { ...s.connectedApps, [interviewId]: connected ? [...current, appId] : current } };
      }),
      saveHelperDraft: (interviewId, draft) => set((s) => {
        const helperDrafts = { ...s.helperDrafts };
        if (draft) helperDrafts[interviewId] = draft;
        else delete helperDrafts[interviewId];
        return { helperDrafts };
      }),
      savePersonalHelper: (helper) => set((s) => ({ personalHelpers: [...s.personalHelpers.filter((h) => h.id !== helper.id), helper] })),
      removePersonalHelper: (id) => set((s) => ({ personalHelpers: s.personalHelpers.filter((h) => h.id !== id) })),
      reviewHelperRun: (helperId, runId, review) => set((s) => ({ personalHelpers: s.personalHelpers.map((h) => h.id === helperId ? { ...h, runs: h.runs.map((r) => r.id === runId ? { ...r, ...review } : r) } : h) })),

      setWorkspace: (patch) => set((s) => ({ workspace: { ...s.workspace, ...patch } })),
      inviteInterview: ({ name, role, team }) => {
        const id = `iv-${uid()}`;
        set((s) => ({ interviews: [...s.interviews, blankInterview(id, name, role, team, now())] }));
        return id;
      },
      saveInterview: (iv) => set((s) => ({ interviews: s.interviews.map((x) => (x.id === iv.id ? iv : x)) })),
      removeInterview: (id) => set((s) => ({ interviews: s.interviews.filter((x) => x.id !== id), personalHelpers: s.personalHelpers.filter((h) => h.interviewId !== id), helperDrafts: Object.fromEntries(Object.entries(s.helperDrafts).filter(([key]) => key !== id)) })),
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
    {
      name: "fieldwork",
      version: 2,
      skipHydration: true,
      migrate: (persisted) => migratePersisted(persisted) as State,
    },
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
