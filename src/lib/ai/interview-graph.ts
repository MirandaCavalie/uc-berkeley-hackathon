import "server-only";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { answer, promptFor, type RunnerState } from "../engine/interview";
import {
  INTERVIEW_GRAPH_VERSION,
  type InterviewRuntimeNodeId,
} from "../engine/interview-agent";
import type { Interview } from "../types";
import {
  chooseInterviewMove,
  type InterviewTurnDecision,
} from "./interview-agent";

export interface InterviewGraphTrace {
  node: InterviewRuntimeNodeId;
  detail: string;
}

export interface InterviewGraphResult {
  runtime: "langgraph";
  graphVersion: string;
  state: RunnerState;
  prompt: string;
  decision: InterviewTurnDecision;
  route: "follow_up" | "advance";
  trace: InterviewGraphTrace[];
}

const GraphState = Annotation.Root({
  current: Annotation<RunnerState>(),
  answer: Annotation<string>(),
  company: Annotation<string>(),
  sanitizedAnswer: Annotation<string>(),
  deterministic: Annotation<RunnerState>(),
  decision: Annotation<InterviewTurnDecision>(),
  route: Annotation<"follow_up" | "advance">(),
  next: Annotation<RunnerState>(),
  nextPrompt: Annotation<string>(),
  trace: Annotation<InterviewGraphTrace[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

type State = typeof GraphState.State;

const id = (value: InterviewRuntimeNodeId) => value;
const event = (node: InterviewRuntimeNodeId, detail: string): InterviewGraphTrace[] => [{ node, detail }];

function captureAnswer(state: State) {
  if (state.current.interview.consent?.status !== "accepted") throw new Error("Interview consent must be accepted before the graph can run.");
  const sanitizedAnswer = state.answer.trim();
  if (!sanitizedAnswer) throw new Error("The interview answer is empty.");
  return {
    sanitizedAnswer,
    trace: event("capture_answer", "Validated the employee answer and participation scope."),
  };
}

function extractEvidence(state: State) {
  const deterministic = answer(state.current, state.sanitizedAnswer);
  const task = deterministic.interview.tasks[deterministic.taskIndex];
  const detail = task
    ? `Updated “${task.name}” and proposed ${deterministic.step} as the next phase.`
    : `Updated the interview record and proposed ${deterministic.step} as the next phase.`;
  return { deterministic, trace: event("extract_evidence", detail) };
}

async function evidenceGate(state: State) {
  const currentTask = state.current.interview.tasks[state.current.taskIndex];
  const decision = await chooseInterviewMove({
    step: state.current.step,
    taskName: currentTask?.name ?? null,
    currentTaskPain: currentTask?.pain ?? "",
    answer: state.sanitizedAnswer,
    deterministicNextStep: state.deterministic.step,
    deterministicNextTask: state.deterministic.interview.tasks[state.deterministic.taskIndex]?.name ?? null,
  });
  const needsFollowUp =
    (decision.action === "probe" && state.current.step === "pain") ||
    (decision.action === "clarify" && state.current.step === "hours");
  const route = needsFollowUp ? "follow_up" : "advance";
  return {
    decision,
    route,
    trace: event("evidence_gate", `${decision.mode === "model" ? "Jev" : "Local guardrail"} selected ${route.replace("_", " ")}.`),
  };
}

function requestFollowUp(state: State) {
  const step: RunnerState["step"] = state.current.step === "hours" ? "hoursProbe" : "painProbe";
  const next: RunnerState = { ...state.deterministic, step };
  return {
    next,
    trace: event("request_follow_up", step === "hoursProbe" ? "Requested a usable weekly time estimate." : "Requested one concrete recent example."),
  };
}

function advance(state: State) {
  return {
    next: state.deterministic,
    trace: event("advance", `Advanced to ${state.deterministic.step}.`),
  };
}

function composeQuestion(state: State) {
  return {
    nextPrompt: promptFor(state.next, state.company),
    trace: event("compose_question", `Prepared the ${state.next.step} question from the bounded question policy.`),
  };
}

function checkpoint(state: State) {
  const transcript = [
    ...state.current.interview.transcript,
    { from: "ai" as const, text: promptFor(state.current, state.company) },
    { from: "person" as const, text: state.sanitizedAnswer },
  ];
  const updatedInterview: Interview = {
    ...state.next.interview,
    transcript,
    status: "in-progress",
    agent: {
      step: state.next.step,
      taskIndex: state.next.taskIndex,
      graphVersion: INTERVIEW_GRAPH_VERSION,
      lastRoute: state.route,
      lastNodes: [...state.trace.map((item) => item.node), "checkpoint"],
    },
  };
  return {
    next: { ...state.next, interview: updatedInterview },
    trace: event("checkpoint", "Saved the transcript, structured record, route, and resume cursor."),
  };
}

const interviewGraph = new StateGraph(GraphState)
  .addNode(id("capture_answer"), captureAnswer)
  .addNode(id("extract_evidence"), extractEvidence)
  .addNode(id("evidence_gate"), evidenceGate)
  .addNode(id("request_follow_up"), requestFollowUp)
  .addNode(id("advance"), advance)
  .addNode(id("compose_question"), composeQuestion)
  .addNode(id("checkpoint"), checkpoint)
  .addEdge(START, id("capture_answer"))
  .addEdge(id("capture_answer"), id("extract_evidence"))
  .addEdge(id("extract_evidence"), id("evidence_gate"))
  .addConditionalEdges(id("evidence_gate"), (state) => state.route, {
    follow_up: id("request_follow_up"),
    advance: id("advance"),
  })
  .addEdge(id("request_follow_up"), id("compose_question"))
  .addEdge(id("advance"), id("compose_question"))
  .addEdge(id("compose_question"), id("checkpoint"))
  .addEdge(id("checkpoint"), END)
  .compile();

const initialDecision: InterviewTurnDecision = {
  mode: "local",
  action: "continue",
  confidence: 1,
  reason: "The graph has not reached the evidence gate yet.",
};

export async function runInterviewGraph(current: RunnerState, employeeAnswer: string, company: string): Promise<InterviewGraphResult> {
  const result = await interviewGraph.invoke({
    current,
    answer: employeeAnswer,
    company,
    sanitizedAnswer: "",
    deterministic: current,
    decision: initialDecision,
    route: "advance",
    next: current,
    nextPrompt: "",
    trace: [],
  });
  return {
    runtime: "langgraph",
    graphVersion: INTERVIEW_GRAPH_VERSION,
    state: result.next,
    prompt: result.nextPrompt,
    decision: result.decision,
    route: result.route,
    trace: result.trace,
  };
}
