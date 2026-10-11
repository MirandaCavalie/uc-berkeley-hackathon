"use client";

import {
  ArrowRight,
  Braces,
  CheckCircle2,
  GitBranch,
  MessageSquareText,
  Save,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { replay } from "@/lib/engine/interview";
import {
  agentNodes,
  currentAgentNode,
  INTERVIEW_AGENT,
  interviewRuntimeNodes,
  type InterviewRuntimeNodeId,
} from "@/lib/engine/interview-agent";
import type { Interview } from "@/lib/types";

const iconByNode: Record<InterviewRuntimeNodeId, typeof Braces> = {
  capture_answer: ShieldCheck,
  extract_evidence: Braces,
  evidence_gate: ScanSearch,
  request_follow_up: MessageSquareText,
  advance: CheckCircle2,
  compose_question: MessageSquareText,
  checkpoint: Save,
};

const straightPath: InterviewRuntimeNodeId[] = ["capture_answer", "extract_evidence", "evidence_gate"];
const finalPath: InterviewRuntimeNodeId[] = ["compose_question", "checkpoint"];

export function AgentGraph({ interviews }: { interviews: Interview[] }) {
  const activeInterview =
    interviews.find((interview) => interview.status === "in-progress") ??
    interviews.find((interview) => interview.status === "invited") ??
    interviews.find((interview) => interview.status === "completed");
  const activePhase = activeInterview ? currentAgentNode(replay(activeInterview)) : "context";
  const lastNodes = useMemo(() => new Set(activeInterview?.agent?.lastNodes ?? []), [activeInterview?.agent?.lastNodes]);
  const [selectedId, setSelectedId] = useState<InterviewRuntimeNodeId>("evidence_gate");
  const selected = interviewRuntimeNodes.find((node) => node.id === selectedId) ?? interviewRuntimeNodes[0];

  return (
    <Card className="mt-4 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-accent" />
            <h3 className="text-[16px] font-semibold tracking-tight">Interview agent architecture</h3>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">The executable graph that runs on the server for every employee answer.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">LangGraph</Badge>
          <Badge>Jev routing</Badge>
          <Badge>Human review</Badge>
        </div>
      </div>

      <div className="mt-5 grid items-stretch gap-2 lg:grid-cols-[1fr_14px_1fr_14px_1fr_14px_1.15fr_14px_1fr_14px_1fr]">
        {straightPath.map((nodeId) => (
          <GraphStep key={nodeId} nodeId={nodeId} selected={selectedId === nodeId} ran={lastNodes.has(nodeId)} onSelect={setSelectedId} arrow />
        ))}

        <div className="grid gap-2">
          <GraphStep nodeId="request_follow_up" selected={selectedId === "request_follow_up"} ran={lastNodes.has("request_follow_up")} onSelect={setSelectedId} compact />
          <GraphStep nodeId="advance" selected={selectedId === "advance"} ran={lastNodes.has("advance")} onSelect={setSelectedId} compact />
        </div>
        <div className="hidden items-center justify-center lg:flex"><ArrowRight className="size-3.5 text-faint" /></div>

        {finalPath.map((nodeId, index) => (
          <GraphStep key={nodeId} nodeId={nodeId} selected={selectedId === nodeId} ran={lastNodes.has(nodeId)} onSelect={setSelectedId} arrow={index < finalPath.length - 1} />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-paper/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-semibold">{selected.label}</span>
            <Badge tone={lastNodes.has(selected.id) ? "good" : "neutral"}>{selected.owner}</Badge>
          </div>
          {activeInterview?.agent && <span className="text-[11.5px] text-muted">Last route: {activeInterview.agent.lastRoute === "follow_up" ? "follow-up" : "advance"}</span>}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Detail label="Input" value={selected.input} />
          <Detail label="Output" value={selected.output} />
          <Detail label="Control" value={selected.rule} />
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[13.5px] font-semibold">What the employee experiences</h4>
          <span className="text-[11.5px] text-muted">
            {activeInterview ? `${activeInterview.name} · current phase highlighted` : INTERVIEW_AGENT.version}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {agentNodes.map((node, index) => {
            const active = node.key === activePhase;
            return (
              <div key={node.key} className={`rounded-xl border px-3 py-2.5 ${active ? "border-accent bg-accent-soft/70" : "border-line bg-paper/45"}`}>
                <div className="text-[10px] font-medium text-faint tabular-nums">{String(index + 1).padStart(2, "0")}</div>
                <div className="mt-1 text-[12px] font-semibold text-ink">{node.label}</div>
                <div className="mt-0.5 text-[10.5px] leading-4 text-muted">{node.purpose}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function GraphStep({
  nodeId,
  selected,
  ran,
  onSelect,
  arrow = false,
  compact = false,
}: {
  nodeId: InterviewRuntimeNodeId;
  selected: boolean;
  ran: boolean;
  onSelect: (id: InterviewRuntimeNodeId) => void;
  arrow?: boolean;
  compact?: boolean;
}) {
  const node = interviewRuntimeNodes.find((item) => item.id === nodeId)!;
  const Icon = iconByNode[nodeId];
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(nodeId)}
        aria-pressed={selected}
        className={`pressable flex w-full items-center gap-2.5 rounded-xl border p-3 text-left ${compact ? "min-h-0" : "min-h-20"} ${selected ? "border-accent bg-accent-soft/70" : "border-line bg-paper/55 hover:border-line-strong hover:bg-paper"}`}
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-accent text-white" : "bg-surface text-accent shadow-card"}`}>
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11.5px] font-semibold leading-4 text-ink">{node.label}</span>
          <span className={`mt-0.5 block text-[10px] ${ran ? "text-good" : "text-faint"}`}>{ran ? "Ran last turn" : node.owner}</span>
        </span>
      </button>
      {arrow && <div className="hidden items-center justify-center lg:flex"><ArrowRight className="size-3.5 text-faint" /></div>}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</div>
      <div className="mt-1 text-[12px] leading-5 text-ink-2">{value}</div>
    </div>
  );
}
