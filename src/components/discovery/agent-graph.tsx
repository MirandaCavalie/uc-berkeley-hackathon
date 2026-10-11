"use client";

import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  ClipboardCheck,
  MessagesSquare,
  Network,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { buildResearchRun } from "@/lib/engine/research-graph";
import type { Interview, ResearchNodeId, ResearchNodeStatus } from "@/lib/types";
import { useStore } from "@/lib/store";

type Stage = {
  id: string;
  label: string;
  icon: typeof Network;
  nodes: ResearchNodeId[];
  summary: string;
  reads: string;
  creates: string;
  review: string;
};

const stages: Stage[] = [
  {
    id: "coverage",
    label: "Plan coverage",
    icon: Network,
    nodes: ["sampling"],
    summary: "Sets interview targets by team so the research reflects the company, not only the first people who volunteer.",
    reads: "Team roster and headcount",
    creates: "Interview targets by team",
    review: "Every team must have a target",
  },
  {
    id: "scope",
    label: "Set boundaries",
    icon: ShieldCheck,
    nodes: ["consentContext"],
    summary: "Explains what will be collected, records consent, and prevents sensitive information from entering the research.",
    reads: "Employee role and company context",
    creates: "Approved interview scope",
    review: "Consent is required before collection",
  },
  {
    id: "interview",
    label: "Run interviews",
    icon: MessagesSquare,
    nodes: ["interviewSessions"],
    summary: "Asks adaptive follow-up questions about recurring work, time, tools, blockers, AI use, and human judgment.",
    reads: "Role, team, and prior answers",
    creates: "Transcript and work record",
    review: "The employee confirms the record",
  },
  {
    id: "evidence",
    label: "Check evidence",
    icon: ClipboardCheck,
    nodes: ["evidenceExtraction", "qualityAudit"],
    summary: "Links each finding to an employee answer and identifies missing, vague, or contradictory evidence.",
    reads: "Submitted interviews",
    creates: "Traceable findings and follow-ups",
    review: "Weak evidence returns for clarification",
  },
  {
    id: "recommendations",
    label: "Build decisions",
    icon: BrainCircuit,
    nodes: ["teamSynthesis", "companySynthesis", "roadmapDecision"],
    summary: "Finds patterns across teams and turns them into opportunities with owners, risks, confidence, and ROI assumptions.",
    reads: "Reviewed findings across teams",
    creates: "Company work map and roadmap",
    review: "A human owner approves each recommendation",
  },
];

const statusTone: Record<ResearchNodeStatus, "neutral" | "accent" | "good" | "warn" | "bad"> = {
  queued: "neutral",
  running: "accent",
  needs_review: "warn",
  complete: "good",
  blocked: "bad",
};

const statusLabel: Record<ResearchNodeStatus, string> = {
  queued: "Waiting",
  running: "In progress",
  needs_review: "Needs review",
  complete: "Complete",
  blocked: "Blocked",
};

const priority: Record<ResearchNodeStatus, number> = {
  blocked: 5,
  needs_review: 4,
  running: 3,
  queued: 2,
  complete: 1,
};

export function AgentGraph({ interviews }: { interviews: Interview[] }) {
  const workspace = useStore((state) => state.workspace);
  const run = buildResearchRun(workspace, interviews ?? []);
  const [selectedId, setSelectedId] = useState(stages[0].id);
  const selected = stages.find((stage) => stage.id === selectedId) ?? stages[0];
  const snapshots = selected.nodes.map((id) => run.nodes.find((node) => node.id === id)).filter(Boolean);
  const status = stageStatus(snapshots.map((node) => node!.status));
  const progress = stageProgress(snapshots);

  return (
    <Card className="mt-4 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold tracking-tight">Interview workflow</h3>
        <div className="flex items-center gap-4 text-[12px] text-muted">
          <span><strong className="font-semibold text-ink">{run.metrics.completed}</strong> completed</span>
          <span><strong className="font-semibold text-ink">{run.metrics.evidenceReady}</strong> reviewed</span>
          <span><strong className="font-semibold text-ink">{run.metrics.teamsCovered}/{run.metrics.teamsTarget}</strong> teams</span>
        </div>
      </div>

      <div className="mt-5 grid gap-2 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const stageSnapshots = stage.nodes.map((id) => run.nodes.find((node) => node.id === id)).filter(Boolean);
          const stageState = stageStatus(stageSnapshots.map((node) => node!.status));
          const active = stage.id === selected.id;
          return (
            <div key={stage.id} className="relative">
              <button
                type="button"
                onClick={() => setSelectedId(stage.id)}
                aria-pressed={active}
                className={`pressable flex h-full min-h-24 w-full items-start gap-3 rounded-xl border p-3 text-left ${active ? "border-accent bg-accent-soft/70" : "border-line bg-paper/55 hover:border-line-strong hover:bg-paper"}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-accent text-white" : "bg-surface text-accent shadow-card"}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-medium text-faint tabular-nums">0{index + 1}</span>
                  <span className="mt-1 block text-[13px] font-semibold text-ink">{stage.label}</span>
                  <span className="mt-1 block text-[11px] text-muted">{statusLabel[stageState]}</span>
                </span>
              </button>
              {index < stages.length - 1 && <ArrowRight className="absolute top-1/2 -right-3 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-surface p-0.5 text-faint lg:block" />}
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-paper/55 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <h4 className="text-[15px] font-semibold">{selected.label}</h4>
              <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-ink-2">{selected.summary}</p>
          </div>
          {progress && (
            <div className="min-w-32 text-right">
              <div className="text-[18px] font-semibold tabular-nums">{progress.current}/{progress.target}</div>
              <div className="text-[11px] text-muted">current progress</div>
            </div>
          )}
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Detail label="Reads" value={selected.reads} />
          <Detail label="Creates" value={selected.creates} />
          <Detail label="Review rule" value={selected.review} />
        </dl>
        {progress && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, Math.round((progress.current / Math.max(progress.target, 1)) * 100))}%` }} />
          </div>
        )}
        {selected.id === "recommendations" && (
          <div className="mt-4 flex items-center gap-2 text-[11.5px] text-muted">
            <BadgeCheck className="size-3.5 text-accent" /> Recommendations remain drafts until an owner reviews the evidence and assumptions.
          </div>
        )}
      </div>
    </Card>
  );
}

function stageStatus(statuses: ResearchNodeStatus[]): ResearchNodeStatus {
  if (!statuses.length) return "queued";
  if (statuses.every((status) => status === "complete")) return "complete";
  return [...statuses].sort((a, b) => priority[b] - priority[a])[0];
}

function stageProgress(nodes: Array<{ progress?: { current: number; target: number } } | undefined>) {
  const values = nodes.map((node) => node?.progress).filter((value): value is { current: number; target: number } => Boolean(value?.target));
  if (!values.length) return null;
  return values.reduce((best, value) => (value.target > best.target ? value : best), values[0]);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-card">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</dt>
      <dd className="mt-1.5 text-[12.5px] leading-5 text-ink-2">{value}</dd>
    </div>
  );
}
