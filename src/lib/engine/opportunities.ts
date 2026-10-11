import type { Dimension, Interview, JudgmentReport, Opportunity, Phase, RoiAssumptions, Scores, Solution } from "../types";
import { effectiveProcess, WEEKS_PER_MONTH } from "./interview";
import { OTHER, processByName, type ProcessDef } from "./processes";

export const defaultRoi: RoiAssumptions = {
  hourlyCost: 55,
  capture: { automation: 0.8, agent: 0.6, skill: 0.4, human: 0 },
  builderRate: 120,
  adoptionCeilings: [0.4, 0.55, 0.7, 0.8, 0.9],
  runCost: { automation: 50, skill: 30, agent: 400, human: 0 },
};

export const dimensions: { key: Dimension; label: string; inverted: boolean; weight: number }[] = [
  { key: "feasibility", label: "AI can do it", inverted: false, weight: 0.2 },
  { key: "dataReadiness", label: "Data is ready", inverted: false, weight: 0.1 },
  { key: "adoption", label: "Team wants it", inverted: false, weight: 0.15 },
  { key: "risk", label: "Risk if wrong", inverted: true, weight: 0.1 },
  { key: "effort", label: "Effort to build", inverted: true, weight: 0.1 },
];
const VALUE_WEIGHT = 0.35;
const MAX_QUICK_WINS = 3;
const MAX_NEXT = 4;

export const otherProcess: ProcessDef = {
  name: OTHER,
  re: /$^/,
  description: "Recurring work that doesn't fit a known process yet.",
  solution: "skill",
  scores: { feasibility: 3, dataReadiness: 3, risk: 3, effort: 3, adoption: 3 },
  trigger: "the task comes up",
  inputs: "the request and related documents",
  output: "a first draft of the result",
  checkpoint: "the result leaves the team",
  metric: "Hours per week on the task",
};

export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const phaseMeta: Record<Phase, { label: string; window: string }> = {
  now: { label: "Quick wins", window: "Weeks 1–4" },
  next: { label: "Build next", window: "Months 2–3" },
  later: { label: "Later", window: "Months 4–6" },
  keep: { label: "Keep human", window: "Protected" },
};

const norm = (v: number, inverted: boolean) => (inverted ? (5 - v) / 4 : (v - 1) / 4);

export interface Group {
  def: ProcessDef;
  tasks: Opportunity["tasks"];
  waitMentions: string[];
  keepHuman: Opportunity["keepHuman"];
  aiToday: Opportunity["aiToday"];
}

export function groupTasks(interviews: Interview[]): Group[] {
  const done = interviews.filter((i) => i.status === "completed");
  const groups = new Map<string, Group>();
  for (const iv of done) {
    for (const t of iv.tasks) {
      const name = effectiveProcess(t);
      let g = groups.get(name);
      if (!g) {
        g = { def: processByName(name) ?? otherProcess, tasks: [], waitMentions: [], keepHuman: [], aiToday: [] };
        groups.set(name, g);
      }
      g.tasks.push({ ...t, person: iv.name, role: iv.role });
    }
  }
  for (const g of groups.values()) {
    for (const iv of done) {
      if (iv.waits && g.def.re.test(iv.waits)) g.waitMentions.push(iv.name);
      if (iv.keepHuman && g.def.re.test(iv.keepHuman)) g.keepHuman.push({ person: iv.name, text: iv.keepHuman });
      const inGroup = g.tasks.some((t) => t.person === iv.name);
      if (inGroup && iv.aiToday && !/^\s*(no|nope|none|never|not really)\b/i.test(iv.aiToday)) g.aiToday.push({ person: iv.name, text: iv.aiToday });
    }
  }
  return [...groups.values()];
}

export function buildOpportunities(
  interviews: Interview[],
  roi: RoiAssumptions,
  judgments: JudgmentReport | null,
  overrides: Record<string, Solution>,
): Opportunity[] {
  const teamOf = new Map(interviews.map((i) => [i.name, i.team]));
  const drafts = groupTasks(interviews).map((g) => {
    const id = slug(g.def.name);
    const jevSolution = judgments?.items[`solution:${id}`];
    const solution = overrides[id] ?? (jevSolution?.applied ? (jevSolution.label as Solution) : g.def.solution);
    const scores: Scores = { ...g.def.scores };
    for (const d of dimensions) {
      const j = judgments?.items[`score:${id}:${d.key}`];
      if (j?.applied) scores[d.key] = Number(j.label);
    }
    const hoursPerMonth = g.tasks.reduce((n, t) => n + t.hoursPerWeek, 0) * WEEKS_PER_MONTH;
    const recoverableHours = hoursPerMonth * roi.capture[solution];
    const people = [...new Set(g.tasks.map((t) => t.person))];
    return {
      id,
      process: g.def.name,
      description: g.def.description,
      solution,
      scores,
      people,
      teams: [...new Set(people.map((p) => teamOf.get(p) ?? ""))].filter(Boolean),
      tools: [...new Set(g.tasks.flatMap((t) => t.tools))],
      hoursPerMonth: Math.round(hoursPerMonth),
      recoverableHours: Math.round(recoverableHours),
      annualValue: Math.round(recoverableHours * roi.hourlyCost * 12),
      priority: 0,
      phase: "keep" as Phase,
      tasks: g.tasks,
      waitMentions: g.waitMentions,
      keepHuman: g.keepHuman,
      aiToday: g.aiToday,
    };
  });

  const maxValue = Math.max(1, ...drafts.map((o) => o.annualValue));
  const ranked = drafts
    .map((o) => {
      if (o.solution === "human") return o;
      const fit = dimensions.reduce((n, d) => n + d.weight * norm(o.scores[d.key], d.inverted), 0);
      return { ...o, priority: Math.round(100 * (VALUE_WEIGHT * (o.annualValue / maxValue) + fit)) };
    })
    .sort((a, b) => b.priority - a.priority || b.hoursPerMonth - a.hoursPerMonth);

  let quickWins = 0;
  let next = 0;
  return ranked.map((o) => {
    if (o.solution === "human") return { ...o, phase: "keep" };
    const { feasibility, dataReadiness, risk, effort } = o.scores;
    let phase: Phase = "later";
    if (feasibility >= 4 && effort <= 3 && risk <= 4 && quickWins < MAX_QUICK_WINS) {
      phase = "now";
      quickWins++;
    } else if (feasibility >= 3 && dataReadiness >= 3 && next < MAX_NEXT) {
      phase = "next";
      next++;
    }
    return { ...o, phase };
  });
}

export interface RoadmapPhase {
  phase: Phase;
  items: Opportunity[];
  recoverableHours: number;
  annualValue: number;
}

export function roadmap(opportunities: Opportunity[]): RoadmapPhase[] {
  return (["now", "next", "later", "keep"] as Phase[]).map((phase) => {
    const items = opportunities.filter((o) => o.phase === phase);
    return {
      phase,
      items,
      recoverableHours: items.reduce((n, o) => n + o.recoverableHours, 0),
      annualValue: items.reduce((n, o) => n + o.annualValue, 0),
    };
  });
}

/** What Jev sees for each opportunity. Mirrors the API payload schema. */
export function decisionPayload(interviews: Interview[]) {
  return groupTasks(interviews).map((g) => ({
    id: slug(g.def.name),
    process: g.def.name,
    description: g.def.description,
    tasks: g.tasks.map((t) => ({ task: t.name, role: t.role, hoursPerWeek: t.hoursPerWeek, tools: t.tools, whatSlowsItDown: t.pain })).slice(0, 12),
    waitingOnIt: g.waitMentions.length,
    keepHuman: g.keepHuman.map((k) => k.text).slice(0, 5),
    aiUsedToday: g.aiToday.map((a) => a.text).slice(0, 5),
    rule: { solution: g.def.solution, scores: g.def.scores },
  }));
}

export type DecisionPayload = ReturnType<typeof decisionPayload>;

export const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`);
