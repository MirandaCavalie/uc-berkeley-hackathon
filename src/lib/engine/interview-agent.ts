import type { Interview } from "../types";
import type { RunnerState } from "./interview";

export type InterviewNode =
  | "context"
  | "taskInventory"
  | "taskDetail"
  | "frictionProbe"
  | "handoffs"
  | "aiUse"
  | "humanBoundary"
  | "review";

export interface AgentNodeMeta {
  key: InterviewNode;
  label: string;
  purpose: string;
}

export type InterviewRuntimeNodeId =
  | "capture_answer"
  | "extract_evidence"
  | "evidence_gate"
  | "request_follow_up"
  | "advance"
  | "compose_question"
  | "checkpoint";

export interface InterviewRuntimeNode {
  id: InterviewRuntimeNodeId;
  label: string;
  owner: string;
  input: string;
  output: string;
  rule: string;
}

export interface InterviewRuntimeEdge {
  from: InterviewRuntimeNodeId;
  to: InterviewRuntimeNodeId;
  when?: string;
}

export const INTERVIEW_GRAPH_VERSION = "v2 · LangGraph";

/** This manifest is shared by the executable graph and the Discovery diagram. */
export const interviewRuntimeNodes: InterviewRuntimeNode[] = [
  {
    id: "capture_answer",
    label: "Capture answer",
    owner: "Input guard",
    input: "Employee answer + current session",
    output: "Validated answer",
    rule: "Consent must be accepted; blank answers never enter the record.",
  },
  {
    id: "extract_evidence",
    label: "Update work record",
    owner: "Fieldwork parser",
    input: "Validated answer + active interview phase",
    output: "Tasks, time, tools, friction, handoffs, and boundaries",
    rule: "The original answer stays in the transcript; structured fields remain editable.",
  },
  {
    id: "evidence_gate",
    label: "Check evidence",
    owner: "Jev router",
    input: "New evidence + expected fields",
    output: "Continue, clarify time, or ask for an example",
    rule: "Jev may choose only an allowed route; local rules are the safe fallback.",
  },
  {
    id: "request_follow_up",
    label: "Request follow-up",
    owner: "Evidence guardrail",
    input: "Missing time or vague friction",
    output: "A targeted clarification step",
    rule: "The loop is limited to the missing evidence for the current task.",
  },
  {
    id: "advance",
    label: "Advance",
    owner: "Interview router",
    input: "Evidence that passed the gate",
    output: "Next task or interview phase",
    rule: "Every task is inspected before the graph moves to handoffs and boundaries.",
  },
  {
    id: "compose_question",
    label: "Ask next question",
    owner: "Question policy",
    input: "Next phase + employee and company context",
    output: "One bounded interview question",
    rule: "Questions stay inside the approved work-discovery scope.",
  },
  {
    id: "checkpoint",
    label: "Save turn",
    owner: "Session checkpoint",
    input: "Transcript, work record, route, and next phase",
    output: "Resumable interview state",
    rule: "The employee reviews and corrects the record before final submission.",
  },
];

export const interviewRuntimeEdges: InterviewRuntimeEdge[] = [
  { from: "capture_answer", to: "extract_evidence" },
  { from: "extract_evidence", to: "evidence_gate" },
  { from: "evidence_gate", to: "request_follow_up", when: "missing evidence" },
  { from: "evidence_gate", to: "advance", when: "evidence sufficient" },
  { from: "request_follow_up", to: "compose_question" },
  { from: "advance", to: "compose_question" },
  { from: "compose_question", to: "checkpoint" },
];

export const INTERVIEW_AGENT = {
  name: "Fieldwork Agent",
  version: INTERVIEW_GRAPH_VERSION,
  capabilities: [
    "Runs every answer through an executable server-side graph.",
    "Uses Jev only to route evidence through an allowed next step.",
    "Keeps the original transcript beside the structured work record.",
    "Checkpoints every turn and stops for employee review.",
  ],
} as const;

export const agentNodes: AgentNodeMeta[] = [
  { key: "context", label: "Context", purpose: "role and normal week" },
  { key: "taskInventory", label: "Work inventory", purpose: "repeated tasks" },
  { key: "taskDetail", label: "Task detail", purpose: "time and tools" },
  { key: "frictionProbe", label: "Friction", purpose: "pain and evidence" },
  { key: "handoffs", label: "Handoffs", purpose: "where work waits" },
  { key: "aiUse", label: "AI today", purpose: "current behavior" },
  { key: "humanBoundary", label: "Human boundary", purpose: "what must stay human" },
  { key: "review", label: "Review", purpose: "employee correction" },
];

const nodeForStep: Record<RunnerState["step"], InterviewNode> = {
  intro: "context",
  tasks: "taskInventory",
  hours: "taskDetail",
  hoursProbe: "taskDetail",
  pain: "frictionProbe",
  painProbe: "frictionProbe",
  waits: "handoffs",
  aiToday: "aiUse",
  human: "humanBoundary",
  rating: "review",
  review: "review",
};

export function currentAgentNode(state: RunnerState) {
  return nodeForStep[state.step];
}

export function nodeMeta(node: InterviewNode) {
  return agentNodes.find((item) => item.key === node) ?? agentNodes[0];
}

export interface EvidenceCoverage {
  captured: number;
  total: number;
  percent: number;
  labels: string[];
}

export function evidenceCoverage(interview: Interview): EvidenceCoverage {
  const checks = [
    [interview.context, "context"],
    [interview.tasks.length > 0, "repeated tasks"],
    [interview.tasks.some((task) => task.hoursPerWeek > 0), "time"],
    [interview.tasks.some((task) => task.tools.length > 0), "tools"],
    [interview.tasks.some((task) => task.pain), "friction"],
    [interview.waits, "handoffs"],
    [interview.aiToday, "AI today"],
    [interview.keepHuman, "human boundary"],
  ] as const;
  const captured = checks.filter(([value]) => Boolean(value)).length;
  return { captured, total: checks.length, percent: Math.round((captured / checks.length) * 100), labels: checks.filter(([value]) => !value).map(([, label]) => label) };
}
