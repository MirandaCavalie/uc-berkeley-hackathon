/**
 * Asserts the ROI formulas in src/lib/engine/roi.ts against hand-calculated cases.
 * Run: npx tsx scripts/check-roi.ts
 */
import assert from "node:assert/strict";
import { buildOpportunities, defaultRoi } from "../src/lib/engine/opportunities";
import { forecastByArea, forecastOpportunity, MEETING_HELPER_ID, paybackLabel, portfolioSummary, reportedValueByTeam, trackInitiative, type Decision, type ForecastContext } from "../src/lib/engine/roi";
import type { PersonalHelper } from "../src/lib/personal/types";
import { followupInitiatives } from "../src/lib/seed-followup";
import { seedInterviews, seedWorkspace } from "../src/lib/seed-interviews";
import { migratePersisted } from "../src/lib/store";
import type { Interview, InterviewTask, JudgmentReport, Opportunity, Solution, TrackedInitiative } from "../src/lib/types";

const close = (actual: number | null, expected: number, label: string, eps = 1e-6) => {
  assert.ok(actual !== null && Math.abs(actual - expected) < eps, `${label}: expected ${expected}, got ${actual}`);
};

const interview = (name: string, team: string): Interview => ({
  id: name, name, role: "Analyst", team, status: "completed", invitedAt: "", completedAt: "", transcript: [],
  context: "", tasks: [], waits: "", aiToday: "", keepHuman: "", satisfaction: null,
});

const task = (person: string, hoursPerWeek: number): InterviewTask & { person: string; role: string } => ({
  id: `${person}-t`, name: "Task", hoursPerWeek, tools: [], process: "", pain: "", person, role: "Analyst",
});

const opportunity = (id: string, solution: Solution, adoption: number, effort: number, tasks: ReturnType<typeof task>[], teams: string[]): Opportunity => ({
  id, process: id, description: "", solution, teams, tools: [], tasks,
  scores: { feasibility: 4, dataReadiness: 4, risk: 2, effort, adoption },
  people: [...new Set(tasks.map((t) => t.person))],
  hoursPerMonth: 0, recoverableHours: 0, annualValue: 0, priority: 0, phase: "now",
  waitMentions: [], keepHuman: [], aiToday: [],
});

const judgments = (id: string, confidence: number): JudgmentReport => ({
  model: "test", latencyMs: 0, questions: 1, inputTokens: 0,
  items: { [`solution:${id}`]: { label: "agent", confidence, probabilities: {}, rule: "agent", applied: true } },
});

/* ── Case 1: automation, extrapolated to the team and capped at 3× ─────────────
 * Finance: 70 people, 2 interviewed (Ana 5 h/wk, Ben 3 h/wk).
 *   H        = 8 × 4.33                   = 34.64 h/mo
 *   factor   = min(70 ÷ 2, 3)             = 3      → H_team = 103.92
 *   c = 0.8 (automation), a = 0.8 (adoption score 4)
 *   hours    = 103.92 × 0.8 × 0.8         = 66.5088 h/mo
 *   value    = 66.5088 × $55              = $3,657.984/mo
 *   build    = 16 h (effort 2) × $120     = $1,920;  run = $50/mo
 *   value12  = 3,657.984 × (0.3 + 0.6 + 10) = $39,872.0256
 *   cost12   = 1,920 + 12 × 50            = $2,520
 *   net12    = $37,352.0256;  ROI = 37,352.0256 ÷ 2,520 = 14.822232
 *   payback  : m1 1,097.40 < 1,970;  m2 3,292.19 ≥ 2,020 → month 2
 *   low      : 103.92 × 0.48 × 0.60       = 29.92896 h/mo
 *   high     : 103.92 × 0.92 × 0.88       = 84.133632 h/mo
 *   evidence : 2 people, no Jev confidence → medium
 */
const finance = [interview("Ana", "Finance"), interview("Ben", "Finance")];
const ctx1: ForecastContext = { interviews: finance, roster: [{ team: "Finance", employees: 70 }], roi: defaultRoi, judgments: null };
const reporting = opportunity("reporting", "automation", 4, 2, [task("Ana", 5), task("Ben", 3)], ["Finance"]);
const f1 = forecastOpportunity(reporting, ctx1);

close(f1.reportedHours, 34.64, "case 1 H");
close(f1.teamHours, 103.92, "case 1 H_team");
assert.equal(f1.basis, "extrapolated");
assert.equal(f1.capped, true);
assert.deepEqual([f1.interviewed, f1.headcount, f1.peopleCovered], [2, 70, 6]);
close(f1.base.monthlyHours, 66.5088, "case 1 hours back");
close(f1.base.monthlyValue, 3657.984, "case 1 monthly value");
assert.deepEqual([f1.buildHours, f1.base.buildCost, f1.base.monthlyRunCost], [16, 1920, 50]);
close(f1.base.value12, 39872.0256, "case 1 value12");
close(f1.base.cost12, 2520, "case 1 cost12");
close(f1.base.net12, 37352.0256, "case 1 net12");
close(f1.base.roi12, 14.822232, "case 1 ROI");
assert.equal(f1.base.paybackMonth, 2);
close(f1.low.monthlyHours, 29.92896, "case 1 low");
close(f1.high.monthlyHours, 84.133632, "case 1 high");
assert.equal(f1.evidence.strength, "medium");

/* ── Case 2: agent, sample only, never pays back ─────────────────────────────
 * No roster. Cy (Sales) reports 2 h/wk.
 *   H = H_team = 2 × 4.33 = 8.66 h/mo          (sample only)
 *   c = 0.6 (agent), a = 0.4 (adoption score 1)
 *   hours   = 8.66 × 0.6 × 0.4                 = 2.0784 h/mo
 *   value   = 2.0784 × $55                     = $114.312/mo
 *   build   = 160 h (effort 5) × $120          = $19,200;  run = $400/mo
 *   value12 = 114.312 × 10.9                   = $1,246.0008
 *   cost12  = 19,200 + 4,800                   = $24,000
 *   net12   = −$22,753.9992;  ROI = −0.9480833
 *   payback : monthly value < run cost → never → "> 12"
 *   evidence: 1 person, confidence 0.65 → medium; 0.9 with 1 person → still medium; none → weak
 */
const ctx2: ForecastContext = { interviews: [interview("Cy", "Sales")], roster: [], roi: defaultRoi, judgments: judgments("triage", 0.65) };
const triage = opportunity("triage", "agent", 1, 5, [task("Cy", 2)], ["Sales"]);
const f2 = forecastOpportunity(triage, ctx2);

assert.equal(f2.basis, "sample");
close(f2.teamHours, 8.66, "case 2 H_team");
close(f2.base.monthlyHours, 2.0784, "case 2 hours back");
close(f2.base.monthlyValue, 114.312, "case 2 monthly value");
assert.deepEqual([f2.base.buildCost, f2.base.monthlyRunCost], [19200, 400]);
close(f2.base.value12, 1246.0008, "case 2 value12");
close(f2.base.net12, -22753.9992, "case 2 net12");
close(f2.base.roi12, -0.9480833, "case 2 ROI");
assert.equal(f2.base.paybackMonth, null);
assert.equal(paybackLabel(f2.base.paybackMonth), "> 12");
assert.equal(f2.evidence.strength, "medium");
assert.equal(forecastOpportunity(triage, { ...ctx2, judgments: judgments("triage", 0.9) }).evidence.strength, "medium");
assert.equal(forecastOpportunity(triage, { ...ctx2, judgments: null }).evidence.strength, "weak");

/* ── Case 3: tracking → Stop ─────────────────────────────────────────────────
 * Live 2026-07-12, as of 2026-10-10 → 90 days, 3 months of run cost.
 * Reports: m1 10 h (6 reports), m2 8 h (5), m3 6 h (4) → 15 reports.
 *   adoption       = 14 ÷ 20                       = 70%
 *   monthly value  = 6 h × $55                     = $330 < $400 run cost, after 60 days → Stop
 *   invested       = 9,600 + 3 × 400               = $10,800
 *   value reported = (10 + 8 + 6) × $55            = $1,320
 *   predicted      = case 1 forecast at month 3    = 66.5088 h/mo
 *   variance       = (6 − 66.5088) ÷ 66.5088       = −90.97864%
 */
const asOf = "2026-10-10T00:00:00Z";
const inbox: TrackedInitiative = {
  id: "t-inbox", opportunityId: "reporting", name: "Inbox & ticket triage", teams: ["Finance"], solution: "agent", status: "pilot", source: "simulated",
  liveSince: "2026-07-12T00:00:00Z", buildCost: 9600, monthlyRunCost: 400, peopleCovered: 20, activePeople: 14,
  reports: [
    { month: 3, hoursReported: 6, usefulRate: 0.62, reports: 4 },
    { month: 1, hoursReported: 10, usefulRate: 0.7, reports: 6 },
    { month: 2, hoursReported: 8, usefulRate: 0.65, reports: 5 },
  ],
};
const t3 = trackInitiative(inbox, f1, defaultRoi, asOf);

assert.deepEqual([t3.daysLive, t3.monthsLive, t3.totalReports, t3.latestMonth], [90, 3, 15, 3]);
close(t3.adoption, 0.7, "case 3 adoption");
close(t3.monthlyReportedValue, 330, "case 3 monthly value");
assert.equal(t3.decision, "stop");
close(t3.invested, 10800, "case 3 invested");
close(t3.valueReported, 1320, "case 3 value reported");
close(t3.predictedHours, 66.5088, "case 3 predicted");
close(t3.variancePct, -90.97864, "case 3 variance", 1e-4);

// Every other decision branch, from the same initiative.
const decide = (patch: Partial<TrackedInitiative>, forecast = f1) => trackInitiative({ ...inbox, ...patch }, forecast, defaultRoi, asOf).decision;
const strong = [{ month: 1, hoursReported: 70, usefulRate: 0.8, reports: 6 }];
assert.equal(decide({ liveSince: "2026-09-20T00:00:00Z" }), "too-early", "under 30 days");
assert.equal(decide({ reports: [{ month: 1, hoursReported: 70, usefulRate: 0.9, reports: 4 }] }), "too-early", "under 5 reports");
assert.equal(decide({ reports: strong, activePeople: 6 }), "fix", "adoption 30%");
assert.equal(decide({ reports: [{ ...strong[0], usefulRate: 0.5 }] }), "fix", "useful 50%");
// Month 1 is compared with the ramp: 20 h vs 66.5088 × 0.3 = 19.95 predicted → Scale.
assert.equal(decide({ reports: [{ month: 1, hoursReported: 20, usefulRate: 0.8, reports: 6 }], liveSince: "2026-08-30T00:00:00Z" }), "scale", "ramp month 1");
assert.equal(decide({ reports: strong }, null as never), "on-track", "no forecast cannot Scale");
assert.equal(decide({ reports: [{ month: 3, hoursReported: 60, usefulRate: 0.8, reports: 6 }] }), "scale", "60 ≥ 90% of 66.5");
assert.equal(decide({ reports: [{ month: 3, hoursReported: 40, usefulRate: 0.8, reports: 6 }] }), "on-track", "40 < 90% of 66.5");

/* ── Portfolio summary: case 3 (Stop) + a Scale initiative ───────────────────
 * Scale: live 90 days, build $1,920, run $50 → invested 1,920 + 150 = $2,070; reported 60 h × $55 = $3,300.
 *   invested = 10,800 + 2,070 = $12,870;  value = 1,320 + 3,300 = $4,620;  net = −$8,250;  recovered = 35.897%
 */
const scaled = trackInitiative({ ...inbox, id: "t-scale", buildCost: 1920, monthlyRunCost: 50, reports: [{ month: 3, hoursReported: 60, usefulRate: 0.8, reports: 6 }] }, f1, defaultRoi, asOf);
const summary = portfolioSummary([t3, scaled]);
assert.deepEqual([summary.invested, summary.valueReported, summary.net, summary.paidBack, summary.initiativesLive], [12870, 4620, -8250, false, 2]);
close(summary.recovered, 4620 / 12870, "portfolio recovered");
assert.deepEqual(summary.decisions, { "too-early": 0, stop: 1, fix: 0, scale: 1, "on-track": 0 });

/* ── Areas: an opportunity spanning two teams is forecast per team ─────────── */
const both = [...finance, interview("Cy", "Sales")];
const shared = opportunity("shared", "automation", 4, 2, [task("Ana", 5), task("Ben", 3), task("Cy", 2)], ["Finance", "Sales"]);
const areas = forecastByArea([shared], { interviews: both, roster: [{ team: "Finance", employees: 70 }], roi: defaultRoi, judgments: null });
const fin = areas.find((a) => a.team === "Finance")!;
close(fin.processes[0].base.monthlyHours, 66.5088, "Finance area matches case 1");
assert.equal(fin.processes[0].sharedBuild, true);
close(areas.find((a) => a.team === "Sales")!.base.monthlyHours, 8.66 * 0.64, "Sales area is sample only");

/* ── Store migration: a v1 roi slice gains the new defaults ───────────────── */
const migrated = migratePersisted({ roi: { hourlyCost: 70, capture: { automation: 0.5, agent: 0.6, skill: 0.4, human: 0 } } });
assert.equal(migrated.roi.hourlyCost, 70);
assert.equal(migrated.roi.capture.automation, 0.5);
assert.deepEqual([migrated.roi.builderRate, migrated.roi.adoptionCeilings, migrated.roi.runCost], [120, defaultRoi.adoptionCeilings, defaultRoi.runCost]);

/* ── Demo seed: each live initiative lands on the decision the spec lists ─────
 * Uses the real Northwind interviews, rule-based opportunities and default assumptions.
 */
const seedOpps = buildOpportunities(seedInterviews, defaultRoi, null, {});
const seedCtx: ForecastContext = { interviews: seedInterviews, roster: seedWorkspace.teamRoster, roi: defaultRoi, judgments: null };
const runAt = (daysAgo: number, feedback?: "useful" | "needs-work", minutesSaved?: number) => ({
  id: `run-${daysAgo}-${feedback}`, createdAt: new Date(new Date(asOf).getTime() - daysAgo * 86_400_000).toISOString(),
  meetingTitle: "Client sync", source: "sample" as const, mode: "template" as const,
  brief: { summary: "", agenda: [], questions: [], checklist: [], unknowns: [] }, feedback, minutesSaved,
});
const helper = (interviewId: string, createdDaysAgo: number, runs: ReturnType<typeof runAt>[]) =>
  ({ id: `h-${interviewId}`, interviewId, kind: "skill", createdAt: runAt(createdDaysAgo).createdAt, updatedAt: asOf, runs, config: {} }) as unknown as PersonalHelper;
// Two employees started the meeting skill 12 and 9 days ago: 3 reviewed runs, 40 minutes saved.
const helpers = [
  helper(seedInterviews[0].id, 12, [runAt(11, "useful", 15), runAt(4, "useful", 25)]),
  helper(seedInterviews[1].id, 9, [runAt(8, "needs-work"), runAt(2)]),
];

const live = followupInitiatives({ workspace: seedWorkspace, helpers, interviews: seedInterviews, roi: defaultRoi, asOf });
const expected: Record<string, Decision> = {
  "reporting-dashboards": "scale",
  "data-entry-system-updates": "on-track",
  "status-updates-follow-ups": "fix",
  "customer-replies-faqs": "scale",
  "inbox-ticket-triage": "stop",
  [MEETING_HELPER_ID]: "too-early",
};
assert.deepEqual(live.map((i) => i.opportunityId).sort(), Object.keys(expected).sort());
for (const init of live) {
  const opp = seedOpps.find((o) => o.id === init.opportunityId);
  if (init.source === "simulated") assert.ok(opp, `${init.opportunityId} must match an opportunity slug`);
  const result = trackInitiative(init, opp ? forecastOpportunity(opp, seedCtx) : null, defaultRoi, asOf);
  assert.equal(result.decision, expected[init.opportunityId], `${init.name}: ${result.reason}`);
}

// The 3 quick wins + 2 "build next" from the spec are the ones live.
const phaseOf = (id: string) => seedOpps.find((o) => o.id === id)!.phase;
assert.deepEqual(live.filter((i) => i.source === "simulated").map((i) => phaseOf(i.opportunityId)), ["now", "now", "now", "next", "next"]);

// Meeting skill: built from My work feedback only.
const meeting = live.find((i) => i.id === MEETING_HELPER_ID)!;
assert.equal(meeting.source, "my-work");
assert.deepEqual([meeting.peopleCovered, meeting.activePeople, meeting.buildCost, meeting.monthlyRunCost], [2, 2, 0, 60]);
const meetingMonth = meeting.reports.find((r) => r.month === 1)!;
close(meetingMonth.hoursReported, 40 / 60, "meeting hours");
assert.equal(meetingMonth.reports, 3);
close(meetingMonth.usefulRate, 2 / 3, "meeting useful rate");

// Value by team splits each initiative by predicted share and adds back up to the portfolio total.
const seedTracked = live.map((init) => {
  const opp = seedOpps.find((o) => o.id === init.opportunityId);
  return trackInitiative(init, opp ? forecastOpportunity(opp, seedCtx) : null, defaultRoi, asOf);
});
const byTeam = reportedValueByTeam(seedTracked, forecastByArea(seedOpps, seedCtx));
close(byTeam.reduce((n, t) => n + t.value, 0), portfolioSummary(seedTracked).valueReported, "value by team sums to total", 1e-6);
assert.equal(byTeam.find((t) => t.team === "Customer Support")!.value > 0, true);

// Real (non-synthetic) workspace: no seed, only real feedback.
const real = followupInitiatives({ workspace: { ...seedWorkspace, synthetic: false }, helpers, interviews: seedInterviews, roi: defaultRoi, asOf });
assert.deepEqual(real.map((i) => i.id), [MEETING_HELPER_ID]);
assert.deepEqual(followupInitiatives({ workspace: { ...seedWorkspace, synthetic: false }, helpers: [], interviews: [], roi: defaultRoi, asOf }), []);

console.log("check-roi: all assertions passed");
