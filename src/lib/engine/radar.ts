import type { BrandKit, EvidenceItem } from "../types";
import type { Opportunity, ProcessStep, RadarResult, ScoreSet, WorkMode, WorkflowKey } from "../schemas";
import { compositeScore } from "../scoring";
import { countMatches, daysBetween, findQuotes, parseCsv } from "./text";

const CYCLES_PER_MONTH = 2;

interface StageDef {
  id: string;
  name: string;
  timeline: RegExp;
  keywords: RegExp;
  mode: WorkMode;
  owner: string;
  tools: string[];
  /** Active effort hours per calendar day the stage is open. */
  hoursPerDay: number;
  /** Used when no timeline exists but the stage shows up in evidence. */
  fallbackHours: number;
  rationale: string;
}

const stages: StageDef[] = [
  {
    id: "brief",
    name: "Brief intake & clarification",
    timeline: /brief/i,
    keywords: /\b(brief|clarif\w*|open questions?|mandator\w*)\b/i,
    mode: "assist",
    owner: "Marketing Manager",
    tools: ["Google Docs", "Slack"],
    hoursPerDay: 1.5,
    fallbackHours: 6,
    rationale: "Checking a brief for missing audience, mandatories, and specs is pattern work; the strategy inside it is not.",
  },
  {
    id: "references",
    name: "Reference & moodboard gathering",
    timeline: /moodboard|reference/i,
    keywords: /\b(reference|moodboard|pinterest|inspiration)\w*/i,
    mode: "assist",
    owner: "Designer",
    tools: ["Pinterest", "Are.na", "Drive"],
    hoursPerDay: 3,
    fallbackHours: 6,
    rationale: "Search and organization can be accelerated; choosing what feels right stays with the designer.",
  },
  {
    id: "concept",
    name: "Concept development",
    timeline: /concept/i,
    keywords: /\b(concept|routes?|territor\w*|big idea)\b/i,
    mode: "human",
    owner: "Design Team",
    tools: ["Figma"],
    hoursPerDay: 5,
    fallbackHours: 24,
    rationale: "The creative idea is the product. AI can widen options, but the team should own the concept.",
  },
  {
    id: "review",
    name: "Stakeholder creative review",
    timeline: /creative review/i,
    keywords: /\b(feedback|review)\b/i,
    mode: "human",
    owner: "Stakeholders",
    tools: ["Slack", "Email", "Figma"],
    hoursPerDay: 1,
    fallbackHours: 4,
    rationale: "Judgment from leadership and brand is the point of review; the overhead around it is not.",
  },
  {
    id: "consolidation",
    name: "Feedback consolidation",
    timeline: /consolidat/i,
    keywords: /\b(reconcil\w*|consolidat\w*|conflicting|\+1|comments?)\b/i,
    mode: "assist",
    owner: "Design Lead",
    tools: ["Slack", "Email", "Figma", "Notion"],
    hoursPerDay: 4,
    fallbackHours: 6,
    rationale: "Collecting, de-duplicating, and spotting conflicts across channels is repetitive; interpreting intent needs a human sign-off.",
  },
  {
    id: "revision",
    name: "Design revision",
    timeline: /revision/i,
    keywords: /\b(revis\w*|v\d|iteration)\b/i,
    mode: "human",
    owner: "Designer",
    tools: ["Figma", "Photoshop"],
    hoursPerDay: 5,
    fallbackHours: 12,
    rationale: "Craft work. Keep it human — but every round avoided by clearer feedback returns this time to creative work.",
  },
  {
    id: "compliance",
    name: "Brand & legal compliance check",
    timeline: /legal|compliance/i,
    keywords: /\b(legal|claims?|substantiat\w*|guaranteed|certificate)\b/i,
    mode: "assist",
    owner: "Legal / Brand",
    tools: ["Email", "Claims list"],
    hoursPerDay: 2,
    fallbackHours: 4,
    rationale: "Checking copy against a known claims list and brand book is rule-based; final sign-off stays with Legal.",
  },
  {
    id: "approval",
    name: "Final approval",
    timeline: /approval/i,
    keywords: /\b(approv\w*|sign[- ]off)\b/i,
    mode: "human",
    owner: "CMO",
    tools: ["Asana"],
    hoursPerDay: 1,
    fallbackHours: 2,
    rationale: "Accountability for what ships is a leadership decision.",
  },
  {
    id: "adaptation",
    name: "Channel adaptation & resizing",
    timeline: /adapt|resiz/i,
    keywords: /\b(resiz\w*|sizes|9:16|crop|dark mode|re-?cop\w*|adapt\w*)\b/i,
    mode: "automate",
    owner: "Production Designer",
    tools: ["Figma", "Photoshop", "Ad managers"],
    hoursPerDay: 5,
    fallbackHours: 10,
    rationale: "Re-cutting one approved idea into many specs is high-volume, rule-bound production work.",
  },
  {
    id: "copyvariants",
    name: "Copy variants & localization",
    timeline: /copy|translat|locali/i,
    keywords: /\b(headline variants|translat\w*|locali\w*|A\/B)\b/i,
    mode: "assist",
    owner: "Copywriter",
    tools: ["Docs", "Meta Ads"],
    hoursPerDay: 3,
    fallbackHours: 6,
    rationale: "Variants inside an approved message are draftable; the line that becomes the campaign is written by people.",
  },
  {
    id: "handoff",
    name: "Asset handoff & trafficking",
    timeline: /handoff|traffick|upload/i,
    keywords: /\b(naming|re-?export|DAM|upload\w*|traffick\w*)\b/i,
    mode: "automate",
    owner: "Marketing Ops",
    tools: ["DAM", "Ad platforms"],
    hoursPerDay: 3,
    fallbackHours: 4,
    rationale: "Naming, exporting, and uploading follow fixed conventions.",
  },
  {
    id: "reporting",
    name: "Creative performance recap",
    timeline: /report|recap/i,
    keywords: /\b(recap|report\w*|ctr|cpa)\b/i,
    mode: "automate",
    owner: "Performance Lead",
    tools: ["Looker", "Slides"],
    hoursPerDay: 2,
    fallbackHours: 4,
    rationale: "Pulling numbers into a recap is mechanical; deciding what to make next is not.",
  },
];

interface StageStats {
  days: number;
  rows: number;
  notes: string[];
  owner: string | null;
  requestHours: number;
  requestCount: number;
  rounds: Set<string>;
}

export function runRadar(evidence: EvidenceItem[], brand: BrandKit): RadarResult {
  const assumptions: string[] = [];
  const stats = new Map<string, StageStats>(
    stages.map((s) => [s.id, { days: 0, rows: 0, notes: [], owner: null, requestHours: 0, requestCount: 0, rounds: new Set() }]),
  );

  const timelineRows = evidence
    .filter((e) => e.kind === "approvals")
    .flatMap((e) => parseCsv(e.content))
    .filter((r) => r.stage && (r.start || r.end));

  for (const row of timelineRows) {
    const def = stages.find((s) => s.timeline.test(row.stage));
    if (!def) continue;
    const st = stats.get(def.id)!;
    st.days += daysBetween(row.start, row.end);
    st.rows += 1;
    st.owner ??= row.owner || null;
    if (row.round) st.rounds.add(row.round);
    if (row.notes) st.notes.push(row.notes);
  }

  const requestLines = evidence
    .filter((e) => e.kind === "requests")
    .flatMap((e) => e.content.split(/\r?\n/))
    .filter((l) => /est\s*\d/i.test(l));

  for (const line of requestLines) {
    const def =
      stages.find((s) => s.id !== "brief" && s.keywords.test(line)) ??
      stages.find((s) => s.timeline.test(line));
    if (!def) continue;
    const st = stats.get(def.id)!;
    st.requestHours += Number(line.match(/est\s*(\d+(?:\.\d+)?)/i)?.[1] ?? 0);
    st.requestCount += 1;
  }

  if (timelineRows.length) {
    assumptions.push(
      "Calendar days in the approval timeline are converted to active effort with a per-stage hours-per-day factor. Replace with time-tracking data when available.",
    );
  } else {
    assumptions.push("No approval timeline found — stage effort uses default estimates and should be validated with the team.");
  }
  if (requestLines.length) assumptions.push("Ticket estimates from the request queue are added to the matching stage.");
  assumptions.push(`Assumes ${CYCLES_PER_MONTH} campaign launches per month for monthly totals.`);

  const steps: ProcessStep[] = [];
  for (const def of stages) {
    const st = stats.get(def.id)!;
    const hits = countMatches(evidence, def.keywords);
    if (st.rows === 0 && st.requestCount === 0 && hits < 2) continue;

    const timelineHours = st.days * def.hoursPerDay;
    const hours = round1(timelineHours + st.requestHours || def.fallbackHours);
    const pains = [
      ...st.notes.filter(Boolean),
      ...(st.rounds.size > 1 ? [`Repeated in ${st.rounds.size} rounds`] : []),
      ...(st.requestCount ? [`${st.requestCount} manual request ticket${st.requestCount > 1 ? "s" : ""}`] : []),
    ].slice(0, 4);

    steps.push({
      id: def.id,
      name: def.name,
      owner: st.owner ?? def.owner,
      tools: def.tools,
      mode: def.mode,
      hoursPerCycle: hours,
      cyclesPerMonth: CYCLES_PER_MONTH,
      rationale: def.rationale,
      pains,
      evidence: findQuotes(evidence, def.keywords, 2, ["approvals", "requests", "feedback", "brief", "performance"]),
    });
  }

  const byId = new Map(steps.map((s) => [s.id, s]));
  const feedbackSources = new Set(evidence.filter((e) => e.kind === "feedback").map((e) => e.source)).size;
  const hasTimeline = timelineRows.length > 0;
  const hasPerformance = evidence.some((e) => e.kind === "performance");
  const conflictSignals = countMatches(evidence, /\b(conflicting|do not enlarge|let'?s not|instead|too much)\b/i);
  const legalSignals = countMatches(evidence, /\b(legal|claim|substantiat\w*)\b/i);
  const maxRound = Math.max(0, ...timelineRows.map((r) => Number(r.round) || 0));
  const extraRounds = Math.max(0, maxRound - 1);
  const hasSourceFiles = evidence.some((e) => e.kind === "other" && /figma|psd|template|asset/i.test(e.title + e.source));

  const candidates: {
    id: string;
    title: string;
    stepIds: string[];
    workflow: WorkflowKey;
    problem: (h: number) => string;
    aiRole: string;
    humanRole: string;
    base: Omit<ScoreSet, "impact" | "frequency" | "dataReadiness" | "measurement">;
    data: number;
    freq: number;
    metric: string;
    pilotBoundary: string;
    nextIntegration: string;
    keywords: RegExp;
  }[] = [
    {
      id: "opp-feedback",
      title: "Creative feedback & revision-loop intelligence",
      stepIds: ["consolidation", "revision", "review"],
      workflow: "review",
      problem: (h) =>
        `Feedback arrives through ${Math.max(feedbackSources, 1)} channel${feedbackSources === 1 ? "" : "s"} and is reconciled by hand before every revision${extraRounds ? `; the timeline shows ${extraRounds} extra round${extraRounds > 1 ? "s" : ""}` : ""}. About ${Math.round(h)} h per campaign sit in this loop.`,
      aiRole: "Cluster comments across Slack, email, and Figma; flag duplicates and contradictions; identify the decision blocking approval; draft a prioritized revision brief.",
      humanRole: "Design Lead approves the interpretation; the named owner resolves each conflict; the creative direction stays with the team.",
      base: { aiFit: 4, risk: 2, effort: 2 },
      data: feedbackSources >= 2 ? 5 : feedbackSources === 1 ? 3 : 1,
      freq: Math.min(5, 2 + extraRounds + (conflictSignals > 2 ? 1 : 0)),
      metric: "Time from first review to approved version, and number of revision rounds.",
      pilotBoundary: "One campaign, one hero asset, feedback pasted from existing channels. No auto-posting back to Slack or Figma.",
      nextIntegration: "Slack + Figma comment ingestion",
      keywords: /\b(conflicting|reconcil\w*|\+1|feels|bigger|calm|bolder)\b/i,
    },
    {
      id: "opp-adaptation",
      title: "Brand-safe channel adaptation",
      stepIds: ["adaptation", "copyvariants"],
      workflow: "launch",
      problem: (h) =>
        `One approved idea is manually re-cut and re-copied for every channel spec — about ${Math.round(h)} h per campaign of production work.`,
      aiRole: "Generate the channel matrix from the approved brief: per-spec copy within character limits, formats, alt text, and an automatic brand-rule check.",
      humanRole: "Production Designer and Copywriter approve, edit, or reject each asset before export.",
      base: { aiFit: 5, risk: 2, effort: 3 },
      // Copy can be drafted from the brief, but resizing needs design source files.
      data: (evidence.some((e) => e.kind === "brief") ? 2 : 0) + (brand.colors.length ? 1 : 0) + (hasSourceFiles ? 2 : 0),
      freq: Math.min(5, 2 + Math.ceil((stats.get("adaptation")?.requestCount ?? 0) + (stats.get("copyvariants")?.requestCount ?? 0)) / 2),
      metric: "Hours from final approval to all channel assets ready; brand-rule violations caught before Legal.",
      pilotBoundary: "Copy and specs for one campaign across up to 7 channels. Image resizing stays in Figma for now.",
      nextIntegration: "Figma variants API + DAM export",
      keywords: /\b(resiz\w*|sizes|9:16|crop|variants|translat\w*)\b/i,
    },
    {
      id: "opp-compliance",
      title: "Brand & claims pre-check",
      stepIds: ["compliance"],
      workflow: "launch",
      problem: (h) =>
        `Legal catches unsubstantiated claims and banned words late, after design is finished — ${legalSignals} legal/claims mentions in the evidence, ~${Math.round(h)} h per campaign.`,
      aiRole: "Check every line of copy against the brand book and approved-claims list before it reaches Legal, and suggest compliant substitutions.",
      humanRole: "Legal keeps final sign-off; Brand owns the rules.",
      base: { aiFit: 5, risk: 3, effort: 1 },
      data: brand.bannedWords.length || brand.claimRules.length ? 5 : 2,
      freq: Math.min(5, 1 + Math.ceil(legalSignals / 2)),
      metric: "Legal review cycles per campaign; claim issues found after design lock.",
      pilotBoundary: "Pre-check only. Nothing is auto-approved.",
      nextIntegration: "Claims register in Notion / Google Sheets",
      keywords: /\b(claim|legal|guaranteed|warmest|recycled)\b/i,
    },
    {
      id: "opp-references",
      title: "Reference discovery & creative territories",
      stepIds: ["references", "concept"],
      workflow: "studio",
      problem: (h) =>
        `Designers hand-pull references and rebuild moodboards for each campaign, ~${Math.round(h)} h before concepting can start.`,
      aiRole: "Propose divergent territories with palettes inside the brand system, reference search queries, and provocations — to widen options, not choose.",
      humanRole: "The design team picks, mixes, and develops the concept. AI never makes the creative call.",
      base: { aiFit: 3, risk: 2, effort: 2 },
      data: 3,
      freq: 2,
      metric: "Time from brief to first concept review; number of routes explored.",
      pilotBoundary: "Moodboard and territory exploration only — no generated final assets.",
      nextIntegration: "Are.na / Pinterest boards + Figma",
      keywords: /\b(reference|moodboard|pinterest|concept)\w*/i,
    },
    {
      id: "opp-ops",
      title: "Asset ops & performance recap automation",
      stepIds: ["handoff", "reporting"],
      workflow: "none",
      problem: (h) => `Naming fixes, DAM uploads, and weekly recap decks are rebuilt by hand — ~${Math.round(h)} h per campaign.`,
      aiRole: "Apply naming conventions, prepare upload manifests, and draft the weekly recap from channel data.",
      humanRole: "Marketing Ops spot-checks; the Performance Lead writes the 'so what'.",
      base: { aiFit: 4, risk: 1, effort: 3 },
      data: hasPerformance ? 4 : 2,
      freq: 3,
      metric: "Ops hours per launch; recap turnaround time.",
      pilotBoundary: "Manifest and recap drafts only. No direct uploads to ad platforms.",
      nextIntegration: "DAM + Looker",
      keywords: /\b(naming|recap|DAM|deck|ctr)\b/i,
    },
  ];

  const opportunityHours = candidates.map((c) =>
    c.stepIds.reduce((sum, id) => {
      const s = byId.get(id);
      if (!s) return sum;
      // Only rounds beyond the first count toward the loop opportunity for human steps.
      if (s.mode === "human") {
        const rounds = stats.get(id)?.rounds.size ?? 1;
        return sum + (rounds > 1 ? s.hoursPerCycle * ((rounds - 1) / rounds) : 0);
      }
      return sum + s.hoursPerCycle;
    }, 0),
  );
  const maxHours = Math.max(...opportunityHours, 1);

  const opportunities: Opportunity[] = candidates
    .map((c, i) => ({ c, hours: opportunityHours[i] }))
    .filter(({ c, hours }) => hours > 0 && c.stepIds.some((id) => byId.has(id)))
    .map(({ c, hours }) => {
      const scores: ScoreSet = {
        impact: Math.max(1, Math.round((hours / maxHours) * 5)),
        frequency: clamp(c.freq),
        aiFit: c.base.aiFit,
        dataReadiness: clamp(c.data),
        risk: c.base.risk,
        effort: c.base.effort,
        measurement: hasTimeline ? 5 : hasPerformance ? 3 : 2,
      };
      return {
        id: c.id,
        title: c.title,
        stepIds: c.stepIds.filter((id) => byId.has(id)),
        problem: c.problem(hours),
        aiRole: c.aiRole,
        humanRole: c.humanRole,
        scores,
        evidence: findQuotes(evidence, c.keywords, 3, ["feedback", "approvals", "requests", "brief"]),
        metric: c.metric,
        pilotBoundary: c.pilotBoundary,
        nextIntegration: c.nextIntegration,
        workflow: c.workflow,
      };
    })
    .sort((a, b) => compositeScore(b.scores) - compositeScore(a.scores));

  const top = opportunities[0];
  const totalHours = steps.reduce((s, x) => s + x.hoursPerCycle, 0);
  const machineHours = steps.filter((s) => s.mode !== "human").reduce((s, x) => s + x.hoursPerCycle, 0);

  return {
    summary: top
      ? `Reconstructed ${steps.length} steps from ${evidence.length} evidence files. ${Math.round((machineHours / (totalHours || 1)) * 100)}% of the ~${Math.round(totalHours)} hours per campaign is work AI could automate or assist. Start with “${top.title}” — it scores highest on impact, readiness, and measurability while keeping creative judgment with the team.`
      : "Not enough evidence to reconstruct the workflow. Add a brief, some feedback, and an approval timeline.",
    steps,
    opportunities,
    recommendedPilotId: top?.id ?? "",
    assumptions,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}
