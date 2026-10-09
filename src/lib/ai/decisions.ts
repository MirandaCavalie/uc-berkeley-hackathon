import "server-only";
import { stageOptions, type WorkEvent } from "../engine/events";
import { parseComments, directionOf, topicOf, type CommentLabels, type Direction } from "../engine/review";
import type { FeedbackTopic, Opportunity, RadarResult, ScoreSet, WorkMode } from "../schemas";
import { creativeShare, rankOpportunities } from "../scoring";
import type { BrandKit, Judgment, JudgmentReport, ReviewInput } from "../types";
import { askJev, type JevAnswer, type JevBatch, type JevQuestion, type JevRequest } from "./jev";

/** Below these confidences the rule-based label stays and the item is flagged for a person. */
export const THRESHOLD = { mode: 0.55, score: 0.45, label: 0.5, stage: 0.5 } as const;

const modeCriteria: Record<WorkMode, string> = {
  automate:
    "Repetitive, rule-bound work with a clear correct output, such as resizing, exporting, renaming, copying numbers between tools, or checking against a fixed list. AI does it and a person spot-checks.",
  assist:
    "Pattern work that still needs judgment, such as consolidating feedback, drafting copy variants, or a first-pass compliance check. AI prepares a draft and a person approves it.",
  human:
    "Taste, strategy, creative concepting, stakeholder judgment, or an accountable final decision. People own it; AI only widens the options.",
};

const scoreQuestions: Record<Exclude<keyof ScoreSet, "impact" | "frequency">, { instructions: string; levels: string[] }> = {
  aiFit: {
    instructions: "How well can current AI handle the part of `opportunity` that is assigned to AI (`opportunity.aiRole`)?",
    levels: [
      "Not at all: it needs taste or context AI does not have",
      "Poorly: frequent errors a person must redo",
      "Partly: useful drafts that need heavy edits",
      "Well: reliable drafts that need light review",
      "Very well: routine pattern work AI does reliably",
    ],
  },
  dataReadiness: {
    instructions: "Are the inputs AI needs for `opportunity` already captured in tools or files, based on `opportunity.evidence`?",
    levels: [
      "The inputs do not exist yet",
      "Scattered and mostly in people's heads",
      "Partly captured in tools",
      "Mostly captured in tools and exports",
      "Fully available as text or structured exports",
    ],
  },
  risk: {
    instructions: "If the AI part of `opportunity` gets something wrong, how much brand, legal, or quality damage could reach customers despite `opportunity.humanRole`?",
    levels: [
      "None: internal work that is easily caught",
      "Low: minor rework",
      "Moderate: caught in normal review",
      "High: errors could ship to customers",
      "Severe: legal exposure or lasting brand harm",
    ],
  },
  effort: {
    instructions: "How hard is it to build a safe first version of `opportunity`?",
    levels: ["Trivial: days", "Easy: about a week", "Moderate: a few weeks", "Hard: needs integrations", "Very hard: months of work"],
  },
  measurement: {
    instructions: "Can the team measure `opportunity` against a before-and-after baseline using `opportunity.metric`?",
    levels: [
      "No clear metric",
      "A vague metric",
      "A clear metric but no baseline",
      "A clear metric with a partial baseline",
      "A clear metric with a baseline already in the evidence",
    ],
  },
};

const topicCriteria: Record<FeedbackTopic, string> = {
  headline: "The headline, tagline, or platform line wording and tone",
  logo: "Logo or lockup size and placement",
  color: "Colors, palette, or color grading of the image",
  typography: "Typefaces, font choice, kerning",
  layout: "Spacing, alignment, grid, margins",
  imagery: "Photography, product framing, crops, video cuts and formats",
  cta: "The call-to-action button or its timing",
  copy: "Body copy, subheads, captions, subject lines",
  legal: "Legal claims, substantiation, certificates, banned or regulated wording",
  other: "None of the other topics",
};

const directionCriteria: Record<Direction, string> = {
  bigger: "Make an element larger or more prominent",
  smaller: "Make an element smaller or less prominent",
  keep: "Keep it as it is, or push back against changing it",
  louder: "Make the tone or headline bolder, louder, more energetic",
  calmer: "Make the tone calmer, quieter, more restrained",
  warmer: "Make colors or grading warmer",
  cooler: "Make colors or grading cooler",
  remove: "Remove or cut something",
  replace: "Swap something for a specific alternative",
  add: "Add something missing or make something visible",
  change: "Some other change not listed",
};

const ruleDirectionCriteria: Partial<Record<Direction, string>> = {
  keep: "Fixes the element's size, position, or style and forbids changing it, such as 'never enlarge'",
  bigger: "Requires a minimum size or prominence, such as 'at least 40% of frame'",
  smaller: "Caps the element at a maximum size or prominence",
  calmer: "Requires a restrained, quiet tone",
  louder: "Requires a bold, energetic tone",
  cooler: "Requires cool colors or grading",
  warmer: "Requires warm colors or grading",
  change: "A general rule that does not push the element in any direction",
};

function judgment(answer: JevAnswer | undefined, rule: string, threshold: number): Judgment | null {
  if (!answer || answer.type !== "choice") return null;
  return {
    label: answer.choice,
    confidence: answer.confidence,
    probabilities: answer.probabilities,
    rule,
    applied: answer.confidence >= threshold,
  };
}

function report(batch: JevBatch, items: Record<string, Judgment>): JudgmentReport {
  return { model: batch.model, latencyMs: batch.latencyMs, questions: batch.questions, inputTokens: batch.inputTokens, items };
}

export async function judgeRadar(result: RadarResult): Promise<{ result: RadarResult; judgments: JudgmentReport }> {
  const requests: JevRequest[] = [
    ...result.steps.map((s) => ({
      state: {
        step: {
          name: s.name,
          owner: s.owner,
          tools: s.tools,
          description: s.rationale,
          pains: s.pains,
          evidence: s.evidence.map((e) => e.quote),
        },
      },
      questions: {
        [`step:${s.id}`]: {
          type: "choice",
          instructions: "How should AI be involved in the marketing workflow step described in `step`?",
          criteria: modeCriteria,
        } satisfies JevQuestion,
      },
    })),
    ...result.opportunities.map((o) => ({
      state: {
        opportunity: {
          title: o.title,
          problem: o.problem,
          aiRole: o.aiRole,
          humanRole: o.humanRole,
          boundary: o.pilotBoundary,
          metric: o.metric,
          evidence: o.evidence.map((e) => e.quote),
        },
      },
      questions: Object.fromEntries(
        Object.entries(scoreQuestions).map(([dim, q]) => [
          `score:${o.id}:${dim}`,
          { type: "score", instructions: q.instructions, criteria: q.levels } satisfies JevQuestion,
        ]),
      ),
    })),
  ];

  const batch = await askJev(requests);
  const items: Record<string, Judgment> = {};

  const steps = result.steps.map((s) => {
    const j = judgment(batch.answers[`step:${s.id}`], s.mode, THRESHOLD.mode);
    if (!j) return s;
    items[`step:${s.id}`] = j;
    return j.applied ? { ...s, mode: j.label as WorkMode } : s;
  });

  const opportunities: Opportunity[] = result.opportunities.map((o) => {
    const scores = { ...o.scores };
    for (const dim of Object.keys(scoreQuestions) as (keyof typeof scoreQuestions)[]) {
      const a = batch.answers[`score:${o.id}:${dim}`];
      if (!a || a.type !== "score") continue;
      const value = Math.round((a.score + 1) * 10) / 10;
      const applied = a.confidence >= THRESHOLD.score;
      items[`score:${o.id}:${dim}`] = {
        label: String(value),
        confidence: a.confidence,
        probabilities: a.probabilities,
        rule: String(o.scores[dim]),
        applied,
      };
      if (applied) scores[dim] = value;
    }
    return { ...o, scores };
  });

  const top = rankOpportunities(opportunities)[0];
  const previous = result.opportunities.find((o) => o.id === result.recommendedPilotId);
  const split = creativeShare(steps);
  let summary = result.summary.replace(/\d+% of the/, `${split.automatePct + split.assistPct}% of the`);
  if (previous && top) summary = summary.replace(`“${previous.title}”`, `“${top.title}”`);

  return {
    result: { ...result, steps, opportunities, recommendedPilotId: top?.id ?? result.recommendedPilotId, summary },
    judgments: report(batch, items),
  };
}

export async function labelComments(input: ReviewInput, brand: BrandKit): Promise<{ labelFor: CommentLabels; judgments: JudgmentReport }> {
  const comments = [...new Set(parseComments(input.feedback).map((c) => c.text))];
  const texts = [...comments, ...brand.guidelines.filter((g) => !comments.includes(g))];
  const batch = await askJev(
    texts.map((text, i) =>
      i < comments.length
        ? {
            state: { comment: text },
            questions: {
              [`topic:${i}`]: { type: "choice", instructions: "Which creative element does the review comment in `comment` target?", criteria: topicCriteria },
              [`direction:${i}`]: { type: "choice", instructions: "What change does the review comment in `comment` ask for?", criteria: directionCriteria },
            },
          }
        : {
            state: { rule: text },
            questions: {
              [`topic:${i}`]: { type: "choice", instructions: "Which creative element does the brand guideline in `rule` govern?", criteria: topicCriteria },
              [`direction:${i}`]: {
                type: "choice",
                instructions: "How does the brand guideline in `rule` constrain changes to the element it governs?",
                criteria: ruleDirectionCriteria,
              },
            },
          },
    ),
  );

  const items: Record<string, Judgment> = {};
  const labels = new Map<string, { topic?: FeedbackTopic; direction?: Direction }>();
  texts.forEach((text, i) => {
    const topic = judgment(batch.answers[`topic:${i}`], topicOf(text), THRESHOLD.label);
    const direction = judgment(batch.answers[`direction:${i}`], directionOf(text), THRESHOLD.label);
    if (topic) items[`topic:${text}`] = topic;
    if (direction) items[`direction:${text}`] = direction;
    labels.set(text, {
      topic: topic?.applied ? (topic.label as FeedbackTopic) : undefined,
      direction: direction?.applied ? (direction.label as Direction) : undefined,
    });
  });

  return { labelFor: (text) => labels.get(text.trim()), judgments: report(batch, items) };
}

export async function classifyEvents(events: Pick<WorkEvent, "id" | "actor" | "role" | "action" | "source" | "detail" | "stage">[]): Promise<JudgmentReport> {
  const criteria = Object.fromEntries(stageOptions.map((s) => [s.name, s.description]));
  const batch = await askJev(
    events.map((e) => ({
      state: { event: { source: e.source, actor: e.actor, role: e.role, type: e.action, text: e.detail } },
      questions: {
        [`event:${e.id}`]: { type: "choice", instructions: "Which stage of a marketing campaign workflow does `event` belong to?", criteria },
      },
    })),
  );
  const items: Record<string, Judgment> = {};
  for (const e of events) {
    const j = judgment(batch.answers[`event:${e.id}`], e.stage, THRESHOLD.stage);
    if (j) items[e.id] = j;
  }
  return report(batch, items);
}
