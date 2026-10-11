import type { PersonalHelper } from "../personal/types";
import type { Interview, JudgmentReport, Opportunity, RoiAssumptions, Solution, TeamPopulation, TrackedInitiative } from "../types";
import { WEEKS_PER_MONTH } from "./interview";

/**
 * ROI forecast and tracking, per docs/ROI-DASHBOARD.md. Deterministic: no LLM, no clock reads.
 * Forecast numbers are Predicted; tracking numbers are Reported (employee feedback).
 */

export const MAX_EXTRAPOLATION = 3;
/** Share of the adoption ceiling reached in month 1, month 2, and month 3 onwards. */
export const RAMP = [0.3, 0.6, 1] as const;
/** Build hours for effort scores 1–5. */
export const BUILD_HOURS = [8, 16, 40, 80, 160] as const;
export const HORIZON_MONTHS = 12;
const RANGE = { lowCapture: 0.6, lowAdoption: 0.75, highCapture: 1.15, highAdoption: 1.1, highMax: 0.95 };

export const MIN_EVIDENCE = 5;
export const MIN_DAYS_LIVE = 30;
export const STOP_AFTER_DAYS = 60;
export const FIX_ADOPTION = 0.4;
export const FIX_USEFUL = 0.6;
export const SCALE_REPORTED = 0.9;
export const SCALE_ADOPTION = 0.6;
const DAY_MS = 86_400_000;
const DAYS_PER_MONTH = 30;

export type Decision = "too-early" | "stop" | "fix" | "scale" | "on-track";
export type EvidenceStrength = "strong" | "medium" | "weak";

/** Shown in the dashboard's legend, in the order the rules are applied. */
export const decisionRules: { decision: Decision; label: string; rule: string }[] = [
  { decision: "too-early", label: "Too early", rule: `Fewer than ${MIN_EVIDENCE} reports, or live less than ${MIN_DAYS_LIVE} days.` },
  { decision: "stop", label: "Stop", rule: `After ${STOP_AFTER_DAYS} days, reported monthly value is below the monthly run cost.` },
  { decision: "fix", label: "Fix", rule: `Adoption below ${FIX_ADOPTION * 100}% or useful rate below ${FIX_USEFUL * 100}%.` },
  { decision: "scale", label: "Scale", rule: `Reported hours at least ${SCALE_REPORTED * 100}% of predicted and adoption at least ${SCALE_ADOPTION * 100}%.` },
  { decision: "on-track", label: "On track", rule: "None of the above." },
];

export interface ForecastContext {
  /** Used to count the people interviewed in each team. */
  interviews: Interview[];
  /** Team headcounts. Empty or missing means forecasts use the sample only. */
  roster?: TeamPopulation[];
  roi: RoiAssumptions;
  judgments: JudgmentReport | null;
}

export interface Scenario {
  /** null on team rollups, which mix several rates. */
  capture: number | null;
  adoption: number | null;
  /** Steady-state hours of capacity back per month. */
  monthlyHours: number;
  monthlyValue: number;
  /** Value in months 1..12, ramp applied. */
  values: number[];
  buildCost: number;
  monthlyRunCost: number;
  value12: number;
  cost12: number;
  net12: number;
  /** null when there is no cost to divide by. */
  roi12: number | null;
  /** First month cumulative value covers cumulative cost; null means "> 12". */
  paybackMonth: number | null;
}

export interface OpportunityForecast {
  opportunityId: string;
  process: string;
  solution: Solution;
  teams: string[];
  /** Hours/month reported by interviewees (H). */
  reportedHours: number;
  /** Hours/month after extrapolating to the team (H_team). */
  teamHours: number;
  basis: "extrapolated" | "sample";
  /** "Extrapolated from `interviewed` of `headcount` people". */
  interviewed: number;
  headcount: number;
  /** True when a team's multiplier hit MAX_EXTRAPOLATION. */
  capped: boolean;
  peopleCovered: number;
  buildHours: number;
  base: Scenario;
  low: Scenario;
  high: Scenario;
  evidence: { strength: EvidenceStrength; people: number; confidence: number | null };
}

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
export const rampFor = (month: number) => RAMP[Math.min(Math.max(month, 1), RAMP.length) - 1];

function scenarioFromValues(values: number[], buildCost: number, monthlyRunCost: number, capture: number | null, adoption: number | null, monthlyHours: number, monthlyValue: number): Scenario {
  const value12 = values.reduce((n, v) => n + v, 0);
  const cost12 = buildCost + HORIZON_MONTHS * monthlyRunCost;
  let paybackMonth: number | null = null;
  let cumulative = 0;
  if (value12 > 0) {
    for (let m = 1; m <= values.length; m++) {
      cumulative += values[m - 1];
      if (cumulative >= buildCost + m * monthlyRunCost) {
        paybackMonth = m;
        break;
      }
    }
  }
  const net12 = value12 - cost12;
  return { capture, adoption, monthlyHours, monthlyValue, values, buildCost, monthlyRunCost, value12, cost12, net12, roi12: cost12 > 0 ? net12 / cost12 : null, paybackMonth };
}

function scenario(teamHours: number, capture: number, adoption: number, roi: RoiAssumptions, buildCost: number, monthlyRunCost: number): Scenario {
  const monthlyHours = teamHours * capture * adoption;
  const monthlyValue = monthlyHours * roi.hourlyCost;
  const values = Array.from({ length: HORIZON_MONTHS }, (_, i) => monthlyValue * rampFor(i + 1));
  return scenarioFromValues(values, buildCost, monthlyRunCost, capture, adoption, monthlyHours, monthlyValue);
}

/** Forecast one opportunity from `opportunities.ts`. */
export function forecastOpportunity(o: Opportunity, ctx: ForecastContext): OpportunityForecast {
  const { roi } = ctx;
  const done = ctx.interviews.filter((i) => i.status === "completed");
  const teamOf = new Map(done.map((i) => [i.name, i.team]));
  const roster = new Map((ctx.roster ?? []).filter((t) => t.employees > 0).map((t) => [t.team, t.employees]));

  // Group reported hours and people by team, then extrapolate each team to its headcount.
  const byTeam = new Map<string, { hours: number; people: Set<string> }>();
  for (const t of o.tasks) {
    const team = teamOf.get(t.person) ?? "";
    const g = byTeam.get(team) ?? { hours: 0, people: new Set<string>() };
    g.hours += t.hoursPerWeek * WEEKS_PER_MONTH;
    g.people.add(t.person);
    byTeam.set(team, g);
  }

  let reportedHours = 0;
  let teamHours = 0;
  let peopleCovered = 0;
  let interviewed = 0;
  let headcount = 0;
  let capped = false;
  for (const [team, g] of byTeam) {
    const employees = roster.get(team);
    const sampled = done.filter((i) => i.team === team).length;
    let factor = 1;
    if (employees && sampled > 0) {
      const raw = employees / sampled;
      factor = Math.min(raw, MAX_EXTRAPOLATION);
      capped ||= raw > MAX_EXTRAPOLATION;
      interviewed += sampled;
      headcount += employees;
    }
    reportedHours += g.hours;
    teamHours += g.hours * factor;
    peopleCovered += g.people.size * factor;
  }
  peopleCovered = Math.round(peopleCovered);

  const kept = o.solution === "human";
  const capture = roi.capture[o.solution];
  const adoption = roi.adoptionCeilings[clampScore(o.scores.adoption) - 1];
  // Nothing is built or run for work kept human.
  const buildHours = kept ? 0 : BUILD_HOURS[clampScore(o.scores.effort) - 1];
  const buildCost = buildHours * roi.builderRate;
  const monthlyRunCost = kept ? 0 : o.solution === "skill" ? roi.runCost.skill * peopleCovered : roi.runCost[o.solution];

  const confidence = ctx.judgments?.items[`solution:${o.id}`]?.confidence ?? null;
  const people = o.people.length;
  const c = confidence ?? 0;
  const strength: EvidenceStrength = people >= 3 && c >= 0.8 ? "strong" : people >= 2 || c >= 0.6 ? "medium" : "weak";

  return {
    opportunityId: o.id,
    process: o.process,
    solution: o.solution,
    teams: o.teams,
    reportedHours,
    teamHours,
    basis: interviewed > 0 ? "extrapolated" : "sample",
    interviewed,
    headcount,
    capped,
    peopleCovered,
    buildHours,
    base: scenario(teamHours, capture, adoption, roi, buildCost, monthlyRunCost),
    low: scenario(teamHours, capture * RANGE.lowCapture, adoption * RANGE.lowAdoption, roi, buildCost, monthlyRunCost),
    high: scenario(teamHours, Math.min(capture * RANGE.highCapture, RANGE.highMax), Math.min(adoption * RANGE.highAdoption, RANGE.highMax), roi, buildCost, monthlyRunCost),
    evidence: { strength, people, confidence },
  };
}

export interface ProcessArea extends OpportunityForecast {
  /** The opportunity spans other teams too; its build cost is counted in full for each team. */
  sharedBuild: boolean;
}

export interface AreaForecast {
  team: string;
  processes: ProcessArea[];
  base: Scenario;
  low: Scenario;
  high: Scenario;
}

function combine(scenarios: Scenario[]): Scenario {
  const values = Array.from({ length: HORIZON_MONTHS }, (_, i) => scenarios.reduce((n, s) => n + s.values[i], 0));
  const sum = (f: (s: Scenario) => number) => scenarios.reduce((n, s) => n + f(s), 0);
  const hours = sum((s) => s.monthlyHours);
  return scenarioFromValues(values, sum((s) => s.buildCost), sum((s) => s.monthlyRunCost), null, null, hours, sum((s) => s.monthlyValue));
}

/** Forecast by team, and by process within each team. Teams sorted by base 12-month net. */
export function forecastByArea(opportunities: Opportunity[], ctx: ForecastContext): AreaForecast[] {
  const teamOf = new Map(ctx.interviews.map((i) => [i.name, i.team]));
  const teams = new Map<string, ProcessArea[]>();
  for (const o of opportunities) {
    for (const team of o.teams) {
      const tasks = o.tasks.filter((t) => teamOf.get(t.person) === team);
      if (!tasks.length) continue;
      const slice: Opportunity = { ...o, teams: [team], tasks, people: o.people.filter((p) => teamOf.get(p) === team) };
      const list = teams.get(team) ?? [];
      list.push({ ...forecastOpportunity(slice, ctx), sharedBuild: o.teams.length > 1 });
      teams.set(team, list);
    }
  }
  return [...teams.entries()]
    .map(([team, processes]) => ({
      team,
      processes: processes.sort((a, b) => b.base.net12 - a.base.net12),
      base: combine(processes.map((p) => p.base)),
      low: combine(processes.map((p) => p.low)),
      high: combine(processes.map((p) => p.high)),
    }))
    .sort((a, b) => b.base.net12 - a.base.net12);
}

export interface InitiativeTracking {
  id: string;
  opportunityId: string;
  name: string;
  teams: string[];
  solution: Solution;
  status: TrackedInitiative["status"];
  daysLive: number;
  /** Months of run cost incurred so far (30-day months, rounded up). */
  monthsLive: number;
  totalReports: number;
  /** Latest reported month, 0 when nothing is reported yet. */
  latestMonth: number;
  adoption: number;
  /** Useful rate in the latest reported month. */
  usefulRate: number;
  /** Reported hours/month in the latest reported month. */
  reportedHours: number;
  /** Forecast hours/month at the same point of the ramp; null without a forecast. */
  predictedHours: number | null;
  variancePct: number | null;
  invested: number;
  valueReported: number;
  monthlyReportedValue: number;
  decision: Decision;
  reason: string;
}

/** Status, variance and decision for one live initiative. `asOf` is passed in so results are reproducible. */
export function trackInitiative(init: TrackedInitiative, forecast: OpportunityForecast | null, roi: RoiAssumptions, asOf: Date | string): InitiativeTracking {
  const daysLive = Math.max(0, Math.floor((new Date(asOf).getTime() - new Date(init.liveSince).getTime()) / DAY_MS));
  const monthsLive = Math.ceil(daysLive / DAYS_PER_MONTH);
  const reports = [...init.reports].sort((a, b) => a.month - b.month);
  const latest = reports.at(-1);
  const totalReports = reports.reduce((n, r) => n + r.reports, 0);
  const latestMonth = latest?.month ?? 0;
  const reportedHours = latest?.hoursReported ?? 0;
  const usefulRate = latest?.usefulRate ?? 0;
  const adoption = init.peopleCovered > 0 ? init.activePeople / init.peopleCovered : 0;
  const predictedHours = forecast ? forecast.base.monthlyHours * rampFor(latestMonth) : null;
  const variancePct = latest && predictedHours ? ((reportedHours - predictedHours) / predictedHours) * 100 : null;
  const monthlyReportedValue = reportedHours * roi.hourlyCost;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  let decision: Decision;
  let reason: string;
  if (totalReports < MIN_EVIDENCE || daysLive < MIN_DAYS_LIVE) {
    decision = "too-early";
    reason = `${totalReports} reports over ${daysLive} days.`;
  } else if (daysLive >= STOP_AFTER_DAYS && monthlyReportedValue < init.monthlyRunCost) {
    decision = "stop";
    reason = `Reported value $${Math.round(monthlyReportedValue)}/mo is below the $${init.monthlyRunCost}/mo run cost.`;
  } else if (adoption < FIX_ADOPTION || usefulRate < FIX_USEFUL) {
    decision = "fix";
    reason = `Adoption ${pct(adoption)}, useful rate ${pct(usefulRate)}.`;
  } else if (predictedHours !== null && reportedHours >= SCALE_REPORTED * predictedHours && adoption >= SCALE_ADOPTION) {
    decision = "scale";
    reason = `Reported ${pct(reportedHours / predictedHours)} of predicted with ${pct(adoption)} adoption.`;
  } else {
    decision = "on-track";
    reason = predictedHours ? `Reported ${pct(reportedHours / predictedHours)} of predicted.` : "No forecast to compare against.";
  }

  return {
    id: init.id,
    opportunityId: init.opportunityId,
    name: init.name,
    teams: init.teams,
    solution: init.solution,
    status: init.status,
    daysLive,
    monthsLive,
    totalReports,
    latestMonth,
    adoption,
    usefulRate,
    reportedHours,
    predictedHours,
    variancePct,
    invested: init.buildCost + init.monthlyRunCost * monthsLive,
    valueReported: reports.reduce((n, r) => n + r.hoursReported, 0) * roi.hourlyCost,
    monthlyReportedValue,
    decision,
    reason,
  };
}

export interface PortfolioSummary {
  /** Build + run cost to date. */
  invested: number;
  /** Reported value to date (employee feedback × hourly cost). */
  valueReported: number;
  net: number;
  paidBack: boolean;
  /** valueReported ÷ invested; null with nothing invested. */
  recovered: number | null;
  initiativesLive: number;
  reportedHoursPerMonth: number;
  predictedHoursPerMonth: number;
  decisions: Record<Decision, number>;
}

/** Headline row for live initiatives. All totals are Reported except `predictedHoursPerMonth`. */
export function portfolioSummary(tracked: InitiativeTracking[]): PortfolioSummary {
  const sum = (f: (t: InitiativeTracking) => number) => tracked.reduce((n, t) => n + f(t), 0);
  const invested = sum((t) => t.invested);
  const valueReported = sum((t) => t.valueReported);
  const decisions: Record<Decision, number> = { "too-early": 0, stop: 0, fix: 0, scale: 0, "on-track": 0 };
  for (const t of tracked) decisions[t.decision]++;
  return {
    invested,
    valueReported,
    net: valueReported - invested,
    paidBack: invested > 0 && valueReported >= invested,
    recovered: invested > 0 ? valueReported / invested : null,
    initiativesLive: tracked.length,
    reportedHoursPerMonth: sum((t) => t.reportedHours),
    predictedHoursPerMonth: sum((t) => t.predictedHours ?? 0),
    decisions,
  };
}

/**
 * Reported value by team. Reports aren't per team, so each initiative's value is split across its teams
 * by that team's share of the predicted hours (evenly when there is no forecast).
 */
export function reportedValueByTeam(tracked: InitiativeTracking[], areas: AreaForecast[]): { team: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const t of tracked) {
    const teams = t.teams.length ? t.teams : ["Unassigned"];
    const weights = teams.map((team) => areas.find((a) => a.team === team)?.processes.find((p) => p.opportunityId === t.opportunityId)?.base.monthlyHours ?? 0);
    const total = weights.reduce((n, w) => n + w, 0);
    teams.forEach((team, i) => totals.set(team, (totals.get(team) ?? 0) + t.valueReported * (total > 0 ? weights[i] / total : 1 / teams.length)));
  }
  return [...totals.entries()].map(([team, value]) => ({ team, value })).sort((a, b) => b.value - a.value);
}

export const MEETING_HELPER_ID ="helper:meeting-preparation";

/**
 * My work helpers as one live initiative. A report is a run the employee marked useful or needs work;
 * hours are their self-reported minutes saved. Built by employees, so there is no build cost.
 */
export function helperInitiative(helpers: PersonalHelper[], interviews: Interview[], roi: RoiAssumptions, asOf: Date | string): TrackedInitiative | null {
  const skills = helpers.filter((h) => h.kind === "skill");
  if (!skills.length) return null;
  const at = new Date(asOf).getTime();
  const liveSince = Math.min(...skills.map((h) => new Date(h.createdAt).getTime()));
  const months = new Map<number, { minutes: number; useful: number; reviewed: number }>();
  const active = new Set<string>();
  for (const h of skills) {
    for (const run of h.runs) {
      const t = new Date(run.createdAt).getTime();
      if (at - t <= DAYS_PER_MONTH * DAY_MS) active.add(h.interviewId);
      const month = Math.floor(Math.max(0, t - liveSince) / (DAYS_PER_MONTH * DAY_MS)) + 1;
      const m = months.get(month) ?? { minutes: 0, useful: 0, reviewed: 0 };
      m.minutes += run.minutesSaved ?? 0;
      if (run.feedback) m.reviewed++;
      if (run.feedback === "useful") m.useful++;
      months.set(month, m);
    }
  }
  const covered = new Set(skills.map((h) => h.interviewId));
  const teams = [...new Set(interviews.filter((i) => covered.has(i.id)).map((i) => i.team))];
  return {
    id: MEETING_HELPER_ID,
    opportunityId: MEETING_HELPER_ID,
    name: "Meeting preparation skill",
    teams,
    solution: "skill",
    status: "pilot",
    source: "my-work",
    liveSince: new Date(liveSince).toISOString(),
    buildCost: 0,
    monthlyRunCost: roi.runCost.skill * covered.size,
    peopleCovered: covered.size,
    activePeople: active.size,
    reports: [...months.entries()].map(([month, m]) => ({
      month,
      hoursReported: m.minutes / 60,
      usefulRate: m.reviewed ? m.useful / m.reviewed : 0,
      reports: m.reviewed,
    })),
  };
}

export const paybackLabel =(month: number | null) => (month === null ? `> ${HORIZON_MONTHS}` : `${month}`);
