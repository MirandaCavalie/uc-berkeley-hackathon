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

export const INTERVIEW_AGENT = {
  name: "Fieldwork Agent",
  version: "v1 · evidence-first",
  capabilities: [
    "Asks the next useful question instead of reading a fixed script.",
    "Probes short or vague answers for a concrete recent example.",
    "Extracts tasks, hours, tools, blockers, AI use, and human boundaries.",
    "Stops at a review step so the employee can correct the record.",
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
