import { z } from "zod";

// Every field is required (nullable where optional) so the same schemas work with
// OpenAI strict structured outputs, Anthropic tool calls, and the local engine.

export const workMode = z.enum(["automate", "assist", "human"]);
export type WorkMode = z.infer<typeof workMode>;

export const workflowKey = z.enum(["review", "launch", "studio", "none"]);
export type WorkflowKey = z.infer<typeof workflowKey>;

export const scoreSet = z.object({
  impact: z.number().min(1).max(5),
  frequency: z.number().min(1).max(5),
  aiFit: z.number().min(1).max(5),
  dataReadiness: z.number().min(1).max(5),
  risk: z.number().min(1).max(5),
  effort: z.number().min(1).max(5),
  measurement: z.number().min(1).max(5),
});
export type ScoreSet = z.infer<typeof scoreSet>;

export const evidenceQuote = z.object({
  evidenceId: z.string(),
  quote: z.string(),
});
export type EvidenceQuote = z.infer<typeof evidenceQuote>;

export const processStep = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  tools: z.array(z.string()),
  mode: workMode,
  hoursPerCycle: z.number(),
  cyclesPerMonth: z.number(),
  rationale: z.string(),
  pains: z.array(z.string()),
  evidence: z.array(evidenceQuote),
});
export type ProcessStep = z.infer<typeof processStep>;

export const opportunity = z.object({
  id: z.string(),
  title: z.string(),
  stepIds: z.array(z.string()),
  problem: z.string(),
  aiRole: z.string(),
  humanRole: z.string(),
  scores: scoreSet,
  evidence: z.array(evidenceQuote),
  metric: z.string(),
  pilotBoundary: z.string(),
  nextIntegration: z.string(),
  workflow: workflowKey,
});
export type Opportunity = z.infer<typeof opportunity>;

export const radarResult = z.object({
  summary: z.string(),
  steps: z.array(processStep),
  opportunities: z.array(opportunity),
  recommendedPilotId: z.string(),
  assumptions: z.array(z.string()),
});
export type RadarResult = z.infer<typeof radarResult>;

export const feedbackTopic = z.enum([
  "logo",
  "color",
  "headline",
  "copy",
  "cta",
  "imagery",
  "layout",
  "typography",
  "legal",
  "other",
]);
export type FeedbackTopic = z.infer<typeof feedbackTopic>;

export const reviewComment = z.object({
  id: z.string(),
  author: z.string(),
  role: z.string(),
  source: z.string(),
  text: z.string(),
  topic: feedbackTopic,
  direction: z.string(),
});
export type ReviewComment = z.infer<typeof reviewComment>;

export const reviewResult = z.object({
  comments: z.array(reviewComment),
  clusters: z.array(
    z.object({
      id: z.string(),
      topic: feedbackTopic,
      summary: z.string(),
      commentIds: z.array(z.string()),
      priority: z.enum(["must", "should", "could"]),
      action: z.string(),
    }),
  ),
  conflicts: z.array(
    z.object({
      id: z.string(),
      topic: feedbackTopic,
      commentIds: z.array(z.string()),
      description: z.string(),
      decisionNeeded: z.string(),
      suggestedOwner: z.string(),
    }),
  ),
  duplicates: z.array(
    z.object({
      commentIds: z.array(z.string()),
      note: z.string(),
    }),
  ),
  blockingDecision: z.object({
    question: z.string(),
    why: z.string(),
    owner: z.string(),
  }),
  revisionBrief: z.object({
    title: z.string(),
    objective: z.string(),
    changes: z.array(
      z.object({
        change: z.string(),
        rationale: z.string(),
        clusterId: z.string(),
      }),
    ),
    keep: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
});
export type ReviewResult = z.infer<typeof reviewResult>;

export const launchAsset = z.object({
  id: z.string(),
  channel: z.string(),
  format: z.string(),
  dimensions: z.string(),
  headline: z.string(),
  body: z.string(),
  cta: z.string(),
  altText: z.string(),
  notes: z.string(),
  headlineLimit: z.number(),
  bodyLimit: z.number(),
});
export type LaunchAsset = z.infer<typeof launchAsset>;

export const launchResult = z.object({
  campaign: z.object({
    name: z.string(),
    audience: z.string(),
    keyMessage: z.string(),
    offer: z.string(),
    cta: z.string(),
    tone: z.string(),
    mandatories: z.array(z.string()),
  }),
  assets: z.array(launchAsset),
  checklist: z.array(z.string()),
  risks: z.array(z.string()),
});
export type LaunchResult = z.infer<typeof launchResult>;

export const territory = z.object({
  id: z.string(),
  name: z.string(),
  idea: z.string(),
  why: z.string(),
  moodWords: z.array(z.string()),
  palette: z.array(
    z.object({ hex: z.string(), name: z.string(), role: z.string() }),
  ),
  typography: z.string(),
  imageryDirection: z.string(),
  referenceQueries: z.array(z.string()),
  logoExplorations: z.array(z.string()),
  riskLevel: z.enum(["safe", "stretch", "bold"]),
  brandFit: z.string(),
});
export type Territory = z.infer<typeof territory>;

export const studioResult = z.object({
  territories: z.array(territory),
  provocations: z.array(z.string()),
});
export type StudioResult = z.infer<typeof studioResult>;

export const tasks = {
  radar: radarResult,
  review: reviewResult,
  launch: launchResult,
  studio: studioResult,
} as const;
export type TaskKey = keyof typeof tasks;
export type TaskResult<K extends TaskKey> = z.infer<(typeof tasks)[K]>;
