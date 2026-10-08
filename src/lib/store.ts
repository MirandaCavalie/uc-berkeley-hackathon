"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  seedBrand,
  seedEvidence,
  seedLaunchInput,
  seedReferences,
  seedReviewInput,
  seedStudioInput,
  seedWorkspace,
} from "./seed";
import type {
  BrandKit,
  Decision,
  EvidenceItem,
  LaunchInput,
  LaunchState,
  PilotEvent,
  RadarState,
  Reference,
  ReviewInput,
  ReviewState,
  StudioInput,
  StepReview,
  StudioState,
  Workspace,
} from "./types";
import type { WorkMode } from "./schemas";

interface Drafts {
  review: ReviewInput;
  launch: LaunchInput;
  studio: StudioInput;
}

interface State {
  workspace: Workspace;
  brand: BrandKit;
  evidence: EvidenceItem[];
  references: Reference[];
  drafts: Drafts;
  radar: RadarState | null;
  review: ReviewState | null;
  launch: LaunchState | null;
  studio: StudioState | null;
  events: PilotEvent[];
  stepReviews: Record<string, StepReview>;

  reviewStep: (key: string, mode: WorkMode) => void;
  clearStepReview: (key: string) => void;
  setBrand: (patch: Partial<BrandKit>) => void;
  addEvidence: (item: Omit<EvidenceItem, "id" | "addedAt">) => void;
  updateEvidence: (id: string, patch: Partial<EvidenceItem>) => void;
  removeEvidence: (id: string) => void;
  addReference: (ref: Omit<Reference, "id" | "addedAt">) => void;
  removeReference: (id: string) => void;
  setDraft: <K extends keyof Drafts>(key: K, patch: Partial<Drafts[K]>) => void;

  setRadar: (s: RadarState) => void;
  setReview: (s: ReviewState) => void;
  setLaunch: (s: LaunchState) => void;
  setStudio: (s: StudioState) => void;

  decideReview: (id: string, d: Decision) => void;
  resolveConflict: (id: string, choice: string) => void;
  approveReview: () => void;
  decideAsset: (id: string, d: Decision) => void;
  editAsset: (id: string, patch: { headline?: string; body?: string }) => void;
  chooseTerritory: (id: string | null) => void;
  togglePin: (key: string) => void;

  log: (e: Omit<PilotEvent, "id" | "at">) => void;
  resetDemo: () => void;
  clearWorkspace: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const initial = () => ({
  workspace: seedWorkspace,
  brand: seedBrand,
  evidence: seedEvidence,
  references: seedReferences,
  drafts: { review: seedReviewInput, launch: seedLaunchInput, studio: seedStudioInput },
  radar: null,
  review: null,
  launch: null,
  studio: null,
  events: [] as PilotEvent[],
  stepReviews: {} as Record<string, StepReview>,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial(),

      reviewStep: (key, mode) => set((s) => ({ stepReviews: { ...s.stepReviews, [key]: { mode, confirmedAt: now() } } })),
      clearStepReview: (key) =>
        set((s) => {
          const next = { ...s.stepReviews };
          delete next[key];
          return { stepReviews: next };
        }),
      setBrand: (patch) => set((s) => ({ brand: { ...s.brand, ...patch } })),
      addEvidence: (item) =>
        set((s) => ({ evidence: [...s.evidence, { ...item, id: `ev-${uid()}`, addedAt: now() }] })),
      updateEvidence: (id, patch) =>
        set((s) => ({ evidence: s.evidence.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvidence: (id) => set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) })),
      addReference: (ref) =>
        set((s) => ({ references: [{ ...ref, id: `ref-${uid()}`, addedAt: now() }, ...s.references] })),
      removeReference: (id) => set((s) => ({ references: s.references.filter((r) => r.id !== id) })),
      setDraft: (key, patch) =>
        set((s) => ({ drafts: { ...s.drafts, [key]: { ...s.drafts[key], ...patch } } })),

      setRadar: (radar) => set({ radar }),
      setReview: (review) => set({ review }),
      setLaunch: (launch) => set({ launch }),
      setStudio: (studio) => set({ studio }),

      decideReview: (id, d) =>
        set((s) => (s.review ? { review: { ...s.review, decisions: { ...s.review.decisions, [id]: d } } } : {})),
      resolveConflict: (id, choice) =>
        set((s) =>
          s.review
            ? { review: { ...s.review, conflictResolutions: { ...s.review.conflictResolutions, [id]: choice } } }
            : {},
        ),
      approveReview: () => set((s) => (s.review ? { review: { ...s.review, approvedAt: now() } } : {})),
      decideAsset: (id, d) =>
        set((s) => (s.launch ? { launch: { ...s.launch, decisions: { ...s.launch.decisions, [id]: d } } } : {})),
      editAsset: (id, patch) =>
        set((s) =>
          s.launch
            ? {
                launch: {
                  ...s.launch,
                  result: {
                    ...s.launch.result,
                    assets: s.launch.result.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
                  },
                  decisions: { ...s.launch.decisions, [id]: "edited" },
                },
              }
            : {},
        ),
      chooseTerritory: (id) => set((s) => (s.studio ? { studio: { ...s.studio, chosenId: id } } : {})),
      togglePin: (key) =>
        set((s) =>
          s.studio
            ? {
                studio: {
                  ...s.studio,
                  pinned: s.studio.pinned.includes(key)
                    ? s.studio.pinned.filter((k) => k !== key)
                    : [...s.studio.pinned, key],
                },
              }
            : {},
        ),

      log: (e) => set((s) => ({ events: [{ ...e, id: uid(), at: now() }, ...s.events].slice(0, 50) })),
      resetDemo: () => set(initial()),
      clearWorkspace: () =>
        set({
          ...initial(),
          workspace: { company: "Your company", industry: "", teamSize: "", synthetic: false },
          evidence: [],
          references: [],
          drafts: { review: { assetName: "", feedback: "" }, launch: { brief: "", channels: seedLaunchInput.channels }, studio: { theme: "", constraints: "" } },
        }),
    }),
    { name: "creativeops-radar", version: 1, skipHydration: true },
  ),
);
