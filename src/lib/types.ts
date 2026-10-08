import type {
  LaunchResult,
  RadarResult,
  ReviewResult,
  StudioResult,
  WorkMode,
} from "./schemas";

export type EvidenceKind =
  | "brief"
  | "feedback"
  | "approvals"
  | "requests"
  | "performance"
  | "other";

export interface EvidenceItem {
  id: string;
  title: string;
  kind: EvidenceKind;
  source: string;
  content: string;
  addedAt: string;
}

export interface BrandColor {
  name: string;
  hex: string;
  usage: string;
}

export interface ClaimRule {
  avoid: string;
  use: string;
}

export interface BrandKit {
  name: string;
  tagline: string;
  voice: string;
  audience: string;
  colors: BrandColor[];
  typography: { display: string; body: string };
  bannedWords: string[];
  claimRules: ClaimRule[];
  guidelines: string[];
  logoDataUrl: string | null;
}

export interface Reference {
  id: string;
  kind: "image" | "link" | "note";
  title: string;
  value: string;
  addedAt: string;
}

export interface Workspace {
  company: string;
  industry: string;
  teamSize: string;
  synthetic: boolean;
}

export type AnalysisEngine = { kind: "llm" | "local"; label: string };

export interface Stamped<T> {
  result: T;
  engine: AnalysisEngine;
  createdAt: string;
  warning: string | null;
}

export interface ReviewInput {
  assetName: string;
  feedback: string;
}

export interface LaunchInput {
  brief: string;
  channels: string[];
}

export interface StudioInput {
  theme: string;
  constraints: string;
}

export type Decision = "approved" | "edited" | "rejected" | "pending";

export interface StepReview {
  mode: WorkMode;
  confirmedAt: string;
}

export interface PilotEvent {
  id: string;
  workflow: "radar" | "review" | "launch" | "studio";
  title: string;
  detail: string;
  at: string;
}

export interface RadarState extends Stamped<RadarResult> {
  evidenceIds: string[];
}

export interface ReviewState extends Stamped<ReviewResult> {
  input: ReviewInput;
  decisions: Record<string, Decision>;
  conflictResolutions: Record<string, string>;
  approvedAt: string | null;
}

export interface LaunchState extends Stamped<LaunchResult> {
  input: LaunchInput;
  decisions: Record<string, Decision>;
}

export interface StudioState extends Stamped<StudioResult> {
  input: StudioInput;
  chosenId: string | null;
  pinned: string[];
}
