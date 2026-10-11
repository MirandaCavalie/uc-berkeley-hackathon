/** How AI should take on a piece of work. */
export type Solution = "automation" | "skill" | "agent" | "human";

export type Phase = "now" | "next" | "later" | "keep";

export interface TeamPopulation {
  team: string;
  employees: number;
}

export interface Workspace {
  company: string;
  industry: string;
  employees: string;
  synthetic: boolean;
  teamRoster?: TeamPopulation[];
}

export interface Judgment {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  rule: string;
  applied: boolean;
}

export interface JudgmentReport {
  model: string;
  latencyMs: number;
  questions: number;
  inputTokens: number;
  items: Record<string, Judgment>;
}

export interface InterviewTask {
  id: string;
  name: string;
  hoursPerWeek: number;
  tools: string[];
  process: string;
  pain: string;
  judgment?: Judgment | null;
}

export interface InterviewMessage {
  from: "ai" | "person";
  text: string;
}

export interface Interview {
  id: string;
  name: string;
  role: string;
  team: string;
  status: "invited" | "in-progress" | "completed";
  invitedAt: string;
  completedAt: string | null;
  transcript: InterviewMessage[];
  context: string;
  tasks: InterviewTask[];
  waits: string;
  aiToday: string;
  keepHuman: string;
  satisfaction: number | null;
  /** Explicit participation scope. Missing means the record still needs a human consent check. */
  consent?: {
    status: "pending" | "accepted" | "declined";
    acceptedAt?: string;
  };
}

export type ResearchNodeId =
  | "sampling"
  | "consentContext"
  | "interviewSessions"
  | "evidenceExtraction"
  | "qualityAudit"
  | "teamSynthesis"
  | "companySynthesis"
  | "roadmapDecision";

export type ResearchNodeStatus = "queued" | "running" | "needs_review" | "complete" | "blocked";

export interface ResearchNodeSnapshot {
  id: ResearchNodeId;
  label: string;
  agent: string;
  stage: "control" | "collection" | "analysis" | "decision";
  purpose: string;
  input: string;
  output: string;
  criterion: string;
  status: ResearchNodeStatus;
  signal: string;
  detail: string;
  progress?: { current: number; target: number };
}

export interface ResearchEdge {
  from: ResearchNodeId;
  to: ResearchNodeId;
  label?: string;
  feedback?: boolean;
}

export interface InterviewQuality {
  completeness: number;
  specificity: number;
  traceability: number;
  score: number;
  missing: string[];
  riskFlags: string[];
  needsReview: boolean;
}

export interface ResearchRun {
  id: string;
  startedAt: string;
  nodes: ResearchNodeSnapshot[];
  edges: ResearchEdge[];
  metrics: {
    population: number;
    target: number;
    completed: number;
    teamsCovered: number;
    teamsTarget: number;
    evidenceReady: number;
    evidenceNeedsReview: number;
    qualityScore: number;
    synthetic: boolean;
  };
}

export interface RoiAssumptions {
  hourlyCost: number;
  capture: Record<Solution, number>;
  /** $/h for the people building a solution. */
  builderRate: number;
  /** Adoption ceiling for adoption scores 1–5 (index 0 = score 1). */
  adoptionCeilings: [number, number, number, number, number];
  /** Monthly run cost per solution. Skills are priced per person covered. */
  runCost: Record<Solution, number>;
}

/** One month of follow-up reports for a live initiative. `month` is 1-based from `liveSince`. */
export interface MonthlyReport {
  month: number;
  hoursReported: number;
  usefulRate: number;
  reports: number;
}

/** A roadmap initiative in pilot or production, linked to its opportunity by id (process slug). */
export interface TrackedInitiative {
  id: string;
  opportunityId: string;
  name: string;
  teams: string[];
  solution: Solution;
  status: "pilot" | "production";
  /** "simulated" is demo seed data; "my-work" comes from employees' helper feedback. */
  source: "simulated" | "my-work";
  liveSince: string;
  buildCost: number;
  monthlyRunCost: number;
  peopleCovered: number;
  activePeople: number;
  reports: MonthlyReport[];
}

export type Dimension = "feasibility" | "dataReadiness" | "risk" | "effort" | "adoption";

export type Scores = Record<Dimension, number>;

export interface Opportunity {
  id: string;
  process: string;
  description: string;
  solution: Solution;
  scores: Scores;
  teams: string[];
  people: string[];
  tools: string[];
  hoursPerMonth: number;
  recoverableHours: number;
  annualValue: number;
  priority: number;
  phase: Phase;
  tasks: (InterviewTask & { person: string; role: string })[];
  waitMentions: string[];
  keepHuman: { person: string; text: string }[];
  aiToday: { person: string; text: string }[];
}

export interface Analysis {
  createdAt: string;
  interviewIds: string[];
  /** Per-opportunity Jev decisions, keyed `solution:<id>` and `score:<id>:<dimension>`. */
  judgments: JudgmentReport | null;
  warning: string | null;
}
