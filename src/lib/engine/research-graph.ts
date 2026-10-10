import { evidenceCoverage } from "./interview-agent";
import { buildSamplePlan, type SamplePlan } from "./sampling";
import type {
  Interview,
  InterviewQuality,
  ResearchEdge,
  ResearchNodeId,
  ResearchNodeSnapshot,
  ResearchNodeStatus,
  ResearchRun,
  Workspace,
} from "../types";

/**
 * The company research graph is intentionally explicit. Every node has a contract:
 * an owner, an input, an output, and a gate. The graph is the orchestration plan;
 * model calls are workers inside a node and never get to invent the next node.
 */
export const RESEARCH_AGENTS = {
  sampling: "Research lead",
  consentContext: "Scope & consent agent",
  interviewSessions: "Interview agents",
  evidenceExtraction: "Evidence analyst",
  qualityAudit: "Quality and bias auditor",
  teamSynthesis: "Team synthesis agents",
  companySynthesis: "Company research lead",
  roadmapDecision: "Roadmap decision agent",
} as const satisfies Record<ResearchNodeId, string>;

export const RESEARCH_EDGES: ResearchEdge[] = [
  { from: "sampling", to: "consentContext", label: "sample + scope" },
  { from: "consentContext", to: "interviewSessions", label: "approved participants" },
  { from: "interviewSessions", to: "evidenceExtraction", label: "transcripts + records" },
  { from: "evidenceExtraction", to: "qualityAudit", label: "evidence objects" },
  { from: "qualityAudit", to: "teamSynthesis", label: "quality-passed evidence" },
  { from: "teamSynthesis", to: "companySynthesis", label: "team patterns" },
  { from: "companySynthesis", to: "roadmapDecision", label: "company opportunities" },
  { from: "qualityAudit", to: "interviewSessions", label: "targeted follow-ups", feedback: true },
];

export const RESEARCH_NODE_CONTRACTS: Record<ResearchNodeId, Omit<ResearchNodeSnapshot, "status" | "signal" | "detail" | "progress">> = {
  sampling: {
    id: "sampling",
    label: "Sample the company",
    agent: RESEARCH_AGENTS.sampling,
    stage: "control",
    purpose: "Choose a defensible wave instead of interviewing whoever volunteers first.",
    input: "Roster, team sizes, research margin",
    output: "Team quotas and invite wave",
    criterion: "Every team has a target; no team is silently omitted.",
  },
  consentContext: {
    id: "consentContext",
    label: "Set scope and consent",
    agent: RESEARCH_AGENTS.consentContext,
    stage: "control",
    purpose: "Tell people what is collected, why it is collected, and what the agent must not ask for.",
    input: "Participant identity, role, company context",
    output: "Approved session scope and privacy flags",
    criterion: "Participant scope is explicit before evidence enters synthesis.",
  },
  interviewSessions: {
    id: "interviewSessions",
    label: "Interview employees",
    agent: RESEARCH_AGENTS.interviewSessions,
    stage: "collection",
    purpose: "Run one adaptive, bounded conversation per sampled employee.",
    input: "Role, team, context, prior answers",
    output: "Transcript plus structured work record",
    criterion: "Each session covers work, time, tools, friction, waits, AI, and human judgment.",
  },
  evidenceExtraction: {
    id: "evidenceExtraction",
    label: "Extract evidence",
    agent: RESEARCH_AGENTS.evidenceExtraction,
    stage: "analysis",
    purpose: "Turn conversational answers into traceable claims without losing the original quote.",
    input: "Transcript and submitted work record",
    output: "Evidence objects linked to an interview and question",
    criterion: "Every claim has a source answer; inferred claims are marked as inference.",
  },
  qualityAudit: {
    id: "qualityAudit",
    label: "Audit quality and bias",
    agent: RESEARCH_AGENTS.qualityAudit,
    stage: "control",
    purpose: "Find missing fields, vague answers, contradictions, and coverage gaps before synthesis.",
    input: "Evidence objects and sample progress",
    output: "Quality score, risk flags, targeted follow-up queue",
    criterion: "Weak evidence loops back for a specific follow-up or human review.",
  },
  teamSynthesis: {
    id: "teamSynthesis",
    label: "Synthesize each team",
    agent: RESEARCH_AGENTS.teamSynthesis,
    stage: "analysis",
    purpose: "Group repeated tasks and handoffs while preserving minority experiences.",
    input: "Quality-passed evidence grouped by team",
    output: "Team work maps, themes, exceptions, and confidence",
    criterion: "A theme needs repeated evidence or a clearly marked single-person signal.",
  },
  companySynthesis: {
    id: "companySynthesis",
    label: "Build the company brain",
    agent: RESEARCH_AGENTS.companySynthesis,
    stage: "analysis",
    purpose: "Connect cross-team work, dependencies, tools, policies, and AI behavior.",
    input: "Team maps plus cross-team handoffs",
    output: "Company process graph and opportunity candidates",
    criterion: "An opportunity states affected teams, evidence, owner, risk, and unknowns.",
  },
  roadmapDecision: {
    id: "roadmapDecision",
    label: "Prioritize the roadmap",
    agent: RESEARCH_AGENTS.roadmapDecision,
    stage: "decision",
    purpose: "Estimate value and effort only after the evidence and human boundaries are visible.",
    input: "Company opportunities, ROI assumptions, human review",
    output: "Prioritized roadmap with ROI ranges and next experiments",
    criterion: "No recommendation ships without evidence, confidence, owner, and human approval.",
  },
};

function employeeCount(value: string) {
  return Number(value.match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? 0);
}

const nonEmpty = (value: string | null | undefined) => Boolean(value?.trim());

export function interviewQuality(interview: Interview): InterviewQuality {
  const coverage = evidenceCoverage(interview);
  const personMessages = interview.transcript.filter((message) => message.from === "person");
  const specificTasks = interview.tasks.filter((task) => task.name.trim().length >= 5 && task.pain.trim().length >= 20);
  const specificity = Math.round(
    Math.min(100, (specificTasks.length / Math.max(interview.tasks.length, 1)) * 60 + (personMessages.filter((m) => m.text.trim().length >= 35).length / Math.max(personMessages.length, 1)) * 40),
  );
  const traceability = Math.round(
    Math.min(100, (personMessages.length / 12) * 45 + (interview.tasks.filter((task) => task.tools.length > 0 && task.hoursPerWeek > 0).length / Math.max(interview.tasks.length, 1)) * 55),
  );
  const missing = coverage.labels;
  const riskFlags = [
    interview.transcript.length === 0 ? "no transcript" : "",
    interview.tasks.length > 0 && interview.tasks.some((task) => task.hoursPerWeek > 168) ? "impossible time estimate" : "",
    interview.consent?.status !== "accepted" ? "consent not recorded" : "",
  ].filter(Boolean);
  const score = Math.round(coverage.percent * 0.5 + specificity * 0.25 + traceability * 0.25);
  return {
    completeness: coverage.percent,
    specificity,
    traceability,
    score,
    missing,
    riskFlags,
    needsReview: score < 75 || riskFlags.length > 0,
  };
}

function node(
  id: ResearchNodeId,
  status: ResearchNodeStatus,
  signal: string,
  detail: string,
  progress?: { current: number; target: number },
): ResearchNodeSnapshot {
  return { ...RESEARCH_NODE_CONTRACTS[id], status, signal, detail, progress };
}

/**
 * Computes the current orchestration state from durable interview records.
 * This is deterministic and safe to run in the browser for the diagram; the
 * server route exposes the same snapshot to a future durable worker.
 */
export function buildResearchRun(workspace: Workspace, interviews: Interview[], hourlyCost = 55): ResearchRun {
  const plan: SamplePlan = buildSamplePlan(workspace, interviews, hourlyCost);
  const completed = interviews.filter((interview) => interview.status === "completed");
  const qualities = completed.map(interviewQuality);
  const evidenceReady = qualities.filter((quality) => !quality.needsReview).length;
  const evidenceNeedsReview = qualities.length - evidenceReady;
  const teamsCovered = new Set(completed.map((interview) => interview.team)).size;
  const teamsTarget = plan.teams.filter((team) => team.target > 0).length;
  const consentPassed = completed.filter((interview) => interview.consent?.status === "accepted").length;
  const qualityScore = qualities.length ? Math.round(qualities.reduce((sum, quality) => sum + quality.score, 0) / qualities.length) : 0;
  const sampleReady = plan.target > 0;
  const sampleComplete = plan.remaining === 0;
  const consentReview = completed.length > consentPassed;
  const sessionsComplete = completed.length > 0 && plan.remaining === 0;
  const qualityComplete = completed.length > 0 && evidenceNeedsReview === 0;
  const teamComplete = evidenceReady > 0 && teamsCovered === teamsTarget && qualityComplete;
  const companyComplete = teamComplete && plan.remaining === 0;

  const nodes: ResearchNodeSnapshot[] = [
    node("sampling", sampleComplete ? "complete" : sampleReady ? "running" : "blocked", `${plan.completed}/${plan.target} interviews`, sampleComplete ? "The wave has reached its target." : `${plan.remaining} sampled people remain in the current wave.`, { current: plan.completed, target: plan.target }),
    node("consentContext", consentReview ? "needs_review" : completed.length ? "complete" : "queued", `${consentPassed}/${completed.length} scoped`, consentReview ? "Consent or collection scope must be confirmed before this evidence is used in a company synthesis." : "Every completed record has an explicit participation scope.", { current: consentPassed, target: completed.length }),
    node("interviewSessions", sessionsComplete ? "complete" : completed.length ? "running" : "queued", `${completed.length} sessions`, sessionsComplete ? "Each sampled session has a submitted work record." : "The live interviewer can continue the next invited session." , { current: completed.length, target: plan.target }),
    node("evidenceExtraction", evidenceReady === completed.length && completed.length > 0 ? "complete" : completed.length ? "needs_review" : "queued", `${evidenceReady}/${completed.length} evidence-ready`, evidenceNeedsReview ? `${evidenceNeedsReview} record${evidenceNeedsReview === 1 ? "" : "s"} need a stronger quote, field, or review.` : "Structured fields remain linked to employee answers.", { current: evidenceReady, target: completed.length }),
    node("qualityAudit", qualityComplete ? "complete" : completed.length ? "needs_review" : "queued", `${qualityScore || "—"}/100 quality`, completed.length ? `${evidenceNeedsReview} record${evidenceNeedsReview === 1 ? "" : "s"} in the follow-up queue.` : "The auditor starts when the first interview is submitted.", { current: evidenceReady, target: completed.length }),
    node("teamSynthesis", teamComplete ? "complete" : evidenceReady ? "running" : "queued", `${teamsCovered}/${teamsTarget} teams`, teamComplete ? "Every sampled team has quality-passed evidence." : "Team patterns wait for coverage and quality gates.", { current: teamsCovered, target: teamsTarget }),
    node("companySynthesis", companyComplete ? "complete" : teamComplete ? "running" : "queued", `${teamsCovered} team maps`, companyComplete ? "Cross-team dependencies can be compared." : "The company graph opens after team maps pass their gates.", { current: teamsCovered, target: teamsTarget }),
    node("roadmapDecision", companyComplete && !workspace.synthetic ? "complete" : companyComplete ? "needs_review" : "queued", workspace.synthetic ? "demo data" : companyComplete ? "ready for approval" : "waiting for evidence", workspace.synthetic ? "Replace the seeded records with consented employee data before using this as a decision." : "A human owner reviews evidence, risk, and ROI before a recommendation is accepted."),
  ];

  return {
    id: `research-${workspace.company.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "workspace"}`,
    // Keep the browser snapshot pure. A durable worker can replace this with
    // its persisted run timestamp when the graph is queued server-side.
    startedAt: "derived-from-current-workspace",
    nodes,
    edges: RESEARCH_EDGES,
    metrics: {
      population: plan.population || employeeCount(workspace.employees),
      target: plan.target,
      completed: completed.length,
      teamsCovered,
      teamsTarget,
      evidenceReady,
      evidenceNeedsReview,
      qualityScore,
      synthetic: workspace.synthetic,
    },
  };
}

export function researchNode(run: ResearchRun, id: ResearchNodeId) {
  return run.nodes.find((item) => item.id === id) ?? run.nodes[0];
}

export function nonEmptyEvidence(interview: Interview) {
  return [interview.context, interview.waits, interview.aiToday, interview.keepHuman, ...interview.tasks.flatMap((task) => [task.name, task.process, task.pain])].filter(nonEmpty);
}
