import "server-only";
import { OTHER, processes, solutionMeta } from "../engine/processes";
import type { DecisionPayload } from "../engine/opportunities";
import type { Dimension, Judgment, JudgmentReport, Solution } from "../types";
import { askJev, type JevAnswer, type JevBatch, type JevQuestion } from "./jev";

/** Below these confidences the rule-based answer stays and the item is flagged for a person. */
export const THRESHOLD = { process: 0.5, solution: 0.6, score: 0.45 } as const;

const solutionCriteria: Record<Solution, string> = {
  automation: `${solutionMeta.automation.definition} Built with workflow tools or scripts; no judgment needed.`,
  skill: `${solutionMeta.skill.definition} Packaged as a prompt, template, or copilot action.`,
  agent: `${solutionMeta.agent.definition} Fits queues of varied requests, matching documents and chasing exceptions, or multi-system setup work.`,
  human: `${solutionMeta.human.definition} Also the answer when the people doing the work say it must stay human.`,
};

const scoreQuestions: Record<Dimension, { instructions: string; levels: string[] }> = {
  feasibility: {
    instructions: "How reliably can today's AI or automation do the repetitive part of the work in `opportunity.tasks`?",
    levels: [
      "Not at all: it is judgment or relationship work",
      "Poorly: frequent errors a person must redo",
      "Partly: useful first drafts that need heavy edits",
      "Well: reliable output that needs light review",
      "Very well: routine work AI and automation already do reliably",
    ],
  },
  dataReadiness: {
    instructions: "Are the inputs for `opportunity.tasks` already in digital systems, judging by the tools listed?",
    levels: [
      "The inputs don't exist yet",
      "Mostly in people's heads or on paper",
      "Partly in tools, partly in email and calls",
      "Mostly in systems and exports",
      "Fully available in systems with exports or APIs",
    ],
  },
  risk: {
    instructions:
      "Assume a person still reviews the output the way the team reviews work today. If AI gets the repetitive part of `opportunity.tasks` wrong, how bad is the worst likely outcome?",
    levels: [
      "Negligible: an internal draft someone fixes in seconds",
      "Low: some rework before anyone outside the team sees it",
      "Moderate: a customer or partner sees a mistake that is easy to correct",
      "High: wrong payments, lost revenue, or a damaged customer relationship",
      "Severe: legal, safety, or regulatory exposure",
    ],
  },
  effort: {
    instructions: "How hard is it to ship a safe first version of `opportunity` with the tools in `opportunity.tasks`?",
    levels: ["Trivial: days", "Easy: about a week", "Moderate: a few weeks", "Hard: needs system integrations", "Very hard: months and new data"],
  },
  adoption: {
    instructions:
      "How likely are the people in `opportunity.tasks` to welcome help, judging by `whatSlowsItDown`, `opportunity.keepHuman`, and `opportunity.aiUsedToday`?",
    levels: [
      "They would resist it: it's the part of the job they value",
      "Skeptical: they'd need convincing",
      "Neutral",
      "Positive: they describe it as a chore",
      "Eager: they already try to offload it",
    ],
  },
};

function judgment(answer: JevAnswer | undefined, rule: string, threshold: number): Judgment | null {
  if (!answer || answer.type !== "choice") return null;
  return { label: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, rule, applied: answer.confidence >= threshold };
}

function report(batch: JevBatch, items: Record<string, Judgment>): JudgmentReport {
  return { model: batch.model, latencyMs: batch.latencyMs, questions: batch.questions, inputTokens: batch.inputTokens, items };
}

/** Sorts each interviewed task into a process from the catalog. */
export async function classifyTasks(tasks: { id: string; name: string; role: string; pain: string; tools: string[]; process: string }[]): Promise<JudgmentReport> {
  const criteria = Object.fromEntries([...processes.map((p) => [p.name, p.description]), [OTHER, "None of the other processes"]]);
  const batch = await askJev(
    tasks.map((t) => ({
      state: { task: { name: t.name, doneBy: t.role, tools: t.tools, whatSlowsItDown: t.pain } },
      questions: {
        [`task:${t.id}`]: {
          type: "choice",
          instructions: "Which business process does `task`, a recurring task an employee described in an interview, belong to?",
          criteria,
        } satisfies JevQuestion,
      },
    })),
  );
  const items: Record<string, Judgment> = {};
  for (const t of tasks) {
    const j = judgment(batch.answers[`task:${t.id}`], t.process, THRESHOLD.process);
    if (j) items[t.id] = j;
  }
  return report(batch, items);
}

/** Decides, per opportunity, what kind of AI fits and how ready it is. */
export async function decideOpportunities(opportunities: DecisionPayload): Promise<JudgmentReport> {
  const batch = await askJev(
    opportunities.map((o) => {
      const { id, rule, ...opportunity } = o;
      void rule;
      return {
        state: { opportunity },
        questions: {
          [`solution:${id}`]: {
            type: "choice",
            instructions:
              "Employees described the recurring work in `opportunity.tasks` in discovery interviews. What is the best way to bring AI into this work?",
            criteria: solutionCriteria,
          } satisfies JevQuestion,
          ...Object.fromEntries(
            Object.entries(scoreQuestions).map(([dim, q]) => [
              `score:${id}:${dim}`,
              { type: "score", instructions: q.instructions, criteria: q.levels } satisfies JevQuestion,
            ]),
          ),
        },
      };
    }),
  );

  const items: Record<string, Judgment> = {};
  for (const o of opportunities) {
    const s = judgment(batch.answers[`solution:${o.id}`], o.rule.solution, THRESHOLD.solution);
    if (s) items[`solution:${o.id}`] = s;
    for (const dim of Object.keys(scoreQuestions) as Dimension[]) {
      const a = batch.answers[`score:${o.id}:${dim}`];
      if (!a || a.type !== "score") continue;
      items[`score:${o.id}:${dim}`] = {
        label: String(Math.min(5, Math.max(1, Math.round(a.score) + 1))),
        confidence: a.confidence,
        probabilities: a.probabilities,
        rule: String(o.rule.scores[dim]),
        applied: a.confidence >= THRESHOLD.score,
      };
    }
  }
  return report(batch, items);
}
