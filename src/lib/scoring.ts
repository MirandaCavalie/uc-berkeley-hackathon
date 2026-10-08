import type { Opportunity, ProcessStep, ScoreSet, WorkMode } from "./schemas";
import type { StepReview } from "./types";

export const stepKey = (step: Pick<ProcessStep, "name">) => step.name.trim().toLowerCase();

export function applyStepReviews(steps: ProcessStep[], reviews: Record<string, StepReview>): ProcessStep[] {
  return steps.map((s) => {
    const r = reviews[stepKey(s)];
    return r && r.mode !== s.mode ? { ...s, mode: r.mode } : s;
  });
}

export const dimensions: {
  key: keyof ScoreSet;
  label: string;
  question: string;
  weight: number;
  inverted: boolean;
}[] = [
  { key: "impact", label: "Impact", question: "How much time, cost, or capacity could this affect?", weight: 0.25, inverted: false },
  { key: "frequency", label: "Frequency", question: "How often does the task occur?", weight: 0.15, inverted: false },
  { key: "aiFit", label: "AI fit", question: "Is the pattern recognizable and assistable by current AI?", weight: 0.15, inverted: false },
  { key: "dataReadiness", label: "Data ready", question: "Are the inputs and examples available?", weight: 0.1, inverted: false },
  { key: "risk", label: "Risk", question: "What could go wrong with brand, legal, privacy, or quality?", weight: 0.15, inverted: true },
  { key: "effort", label: "Effort", question: "How hard is a safe first version?", weight: 0.1, inverted: true },
  { key: "measurement", label: "Measurable", question: "Can the team compare results against a baseline?", weight: 0.1, inverted: false },
];

export function compositeScore(scores: ScoreSet): number {
  const weighted = dimensions.reduce((sum, d) => {
    const raw = clamp(scores[d.key], 1, 5);
    return sum + (d.inverted ? 6 - raw : raw) * d.weight;
  }, 0);
  return Math.round(((weighted - 1) / 4) * 100);
}

export function rankOpportunities(list: Opportunity[]): Opportunity[] {
  return [...list].sort((a, b) => compositeScore(b.scores) - compositeScore(a.scores));
}

export function monthlyHours(step: ProcessStep): number {
  return step.hoursPerCycle * step.cyclesPerMonth;
}

export function hoursByMode(steps: ProcessStep[]): Record<WorkMode, number> {
  const out: Record<WorkMode, number> = { automate: 0, assist: 0, human: 0 };
  for (const s of steps) out[s.mode] += monthlyHours(s);
  return out;
}

export function creativeShare(steps: ProcessStep[]) {
  const h = hoursByMode(steps);
  const total = h.automate + h.assist + h.human || 1;
  return {
    hours: h,
    total,
    automatePct: Math.round((h.automate / total) * 100),
    assistPct: Math.round((h.assist / total) * 100),
    humanPct: Math.round((h.human / total) * 100),
  };
}

export const modeMeta: Record<WorkMode, { label: string; short: string; description: string }> = {
  automate: {
    label: "Automate",
    short: "AI does it",
    description: "Repetitive, rule-bound work. AI executes; a person spot-checks.",
  },
  assist: {
    label: "AI-assisted",
    short: "AI drafts, people decide",
    description: "Pattern work with judgment. AI prepares; a person approves.",
  },
  human: {
    label: "Keep creative",
    short: "People own it",
    description: "Taste, strategy, and final calls. AI only widens the options.",
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}
