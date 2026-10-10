/** How AI should take on a piece of work. */
export type Solution = "automation" | "skill" | "agent" | "human";

export type Phase = "now" | "next" | "later" | "keep";

export interface Workspace {
  company: string;
  industry: string;
  employees: string;
  synthetic: boolean;
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
}

export interface RoiAssumptions {
  hourlyCost: number;
  capture: Record<Solution, number>;
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
