import "server-only";

import { askJev, jevEnabled, type JevQuestion } from "./jev";

export type InterviewStep = "intro" | "tasks" | "hours" | "hoursProbe" | "pain" | "painProbe" | "waits" | "aiToday" | "human" | "rating" | "review";
export type InterviewAction = "continue" | "probe" | "clarify";

export interface InterviewTurnInput {
  step: InterviewStep;
  taskName: string | null;
  currentTaskPain: string;
  answer: string;
  deterministicNextStep: InterviewStep;
  deterministicNextTask: string | null;
}

export interface InterviewTurnDecision {
  mode: "model" | "local";
  action: InterviewAction;
  confidence: number;
  reason: string;
  model?: string;
  latencyMs?: number;
}

const descriptions: Record<InterviewAction, string> = {
  continue: "Move to the next planned interview node because the answer has enough evidence.",
  probe: "Ask for a concrete recent example because the friction answer is too vague to support a roadmap decision.",
  clarify: "Ask for a rough time estimate because the answer did not provide a usable amount.",
};

function fallback(input: InterviewTurnInput): InterviewTurnDecision {
  if (input.deterministicNextStep === "painProbe") {
    return { mode: "local", action: "probe", confidence: 1, reason: "The local evidence guardrail requires a concrete example." };
  }
  if (input.deterministicNextStep === "hoursProbe") {
    return { mode: "local", action: "clarify", confidence: 1, reason: "The local parser did not find a usable time estimate." };
  }
  return { mode: "local", action: "continue", confidence: 1, reason: "The local interview graph selected the next node." };
}

function allowedActions(input: InterviewTurnInput): InterviewAction[] {
  if (input.step === "pain" && input.deterministicNextStep === "painProbe") return ["probe"];
  if (input.step === "hours" && input.deterministicNextStep === "hoursProbe") return ["clarify"];
  if (input.step === "pain") return ["continue", "probe"];
  if (input.step === "hours") return ["continue", "clarify"];
  return ["continue"];
}

export async function chooseInterviewMove(input: InterviewTurnInput): Promise<InterviewTurnDecision> {
  const safeFallback = fallback(input);
  if (!jevEnabled()) return safeFallback;

  const allowed = allowedActions(input);
  const criteria = Object.fromEntries(allowed.map((action) => [action, descriptions[action]]));
  const question: JevQuestion = {
    type: "choice",
    instructions:
      "Choose the next move in an employee work-discovery interview. Use only the allowed actions. Protect evidence quality: do not move on when a concrete example or usable time estimate is required.",
    criteria,
  };

  try {
    const batch = await askJev([
      {
        state: {
          currentStep: input.step,
          task: input.taskName,
          previousPain: input.currentTaskPain,
          employeeAnswer: input.answer,
          deterministicNextStep: input.deterministicNextStep,
          deterministicNextTask: input.deterministicNextTask,
          allowedActions: allowed,
        },
        questions: { nextMove: question },
      },
    ]);
    const answer = batch.answers.nextMove;
    if (!answer || answer.type !== "choice" || !allowed.includes(answer.choice as InterviewAction)) return safeFallback;
    return {
      mode: "model",
      action: answer.choice as InterviewAction,
      confidence: answer.confidence,
      reason: descriptions[answer.choice as InterviewAction],
      model: batch.model,
      latencyMs: batch.latencyMs,
    };
  } catch (error) {
    console.error("[jev:interview]", error);
    return safeFallback;
  }
}
