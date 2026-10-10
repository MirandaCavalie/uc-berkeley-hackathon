"use client";

import { ArrowDown, ArrowRight, BadgeCheck, BrainCircuit, ChevronDown, ClipboardCheck, Database, GitBranch, Network, SearchCheck, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { buildResearchRun } from "@/lib/engine/research-graph";
import type { Interview, ResearchNodeSnapshot, ResearchNodeStatus } from "@/lib/types";
import { useStore } from "@/lib/store";

const icons = {
  sampling: Network,
  consentContext: ShieldCheck,
  interviewSessions: UsersRound,
  evidenceExtraction: Database,
  qualityAudit: SearchCheck,
  teamSynthesis: BrainCircuit,
  companySynthesis: GitBranch,
  roadmapDecision: BadgeCheck,
} as const;

const statusTone: Record<ResearchNodeStatus, "neutral" | "accent" | "good" | "warn" | "bad"> = {
  queued: "neutral",
  running: "accent",
  needs_review: "warn",
  complete: "good",
  blocked: "bad",
};

const statusLabel: Record<ResearchNodeStatus, string> = {
  queued: "Queued",
  running: "Running",
  needs_review: "Review",
  complete: "Passed",
  blocked: "Blocked",
};

export function AgentGraph({ interviews }: { interviews: Interview[] }) {
  const workspace = useStore((state) => state.workspace);
  const run = buildResearchRun(workspace, interviews ?? []);
  const lowerNodes = run.nodes.slice(4);
  const [showContracts, setShowContracts] = useState(false);

  return (
    <Card className="mt-4 overflow-hidden border border-accent/15 bg-[#fbfaff] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Network className="size-4 text-accent" /><h3 className="text-[16px] font-semibold tracking-tight">The discovery control graph</h3></div>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-muted">Every role has a contract and a gate. The model can ask or classify inside a node, but it cannot skip consent, evidence quality, team coverage, or human approval.</p>
        </div>
        <Badge tone={run.metrics.synthetic ? "warn" : "accent"}>{run.metrics.synthetic ? "seeded run" : "live workspace"}</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Sample" value={`${run.metrics.completed}/${run.metrics.target}`} detail={`${run.metrics.population} people`} />
        <Metric label="Teams" value={`${run.metrics.teamsCovered}/${run.metrics.teamsTarget}`} detail="coverage" />
        <Metric label="Evidence" value={`${run.metrics.evidenceReady}/${run.metrics.completed}`} detail="quality-passed" />
        <Metric label="Quality" value={run.metrics.qualityScore ? `${run.metrics.qualityScore}/100` : "—"} detail={`${run.metrics.evidenceNeedsReview} follow-ups`} />
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-4 gap-2">{run.nodes.slice(0, 4).map((node, index) => <NodeCard key={node.id} node={node} index={index} />)}</div>
          <div className="grid grid-cols-4 gap-2 px-[12.5%]"><FlowConnector /><FlowConnector /><FlowConnector /></div>
          <div className="grid grid-cols-4 gap-2">{lowerNodes.map((node, index) => <NodeCard key={node.id} node={node} index={index + 4} />)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted"><ArrowRight className="size-3 text-accent" /><span>Feedback edge: the quality auditor sends a targeted follow-up back to the interview session.</span></div>

      <div className="mt-6 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-accent" /><div><div className="text-[13px] font-semibold">Agent contracts</div><div className="text-[11px] text-muted">8 roles · 8 gates · 1 feedback loop</div></div></div>
          <button type="button" onClick={() => setShowContracts((value) => !value)} className="pressable inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-accent hover:bg-accent-soft"><span>{showContracts ? "Hide criteria" : "Show criteria"}</span><ChevronDown className={`size-3.5 transition-transform ${showContracts ? "rotate-180" : ""}`} /></button>
        </div>
        {showContracts && <div className="mt-3 grid gap-2 lg:grid-cols-2">{run.nodes.map((node) => <ContractRow key={node.id} node={node} />)}</div>}
      </div>
    </Card>
  );
}

function NodeCard({ node, index }: { node: ResearchNodeSnapshot; index: number }) {
  const Icon = icons[node.id];
  const progress = node.progress && node.progress.target > 0 ? Math.min(100, Math.round((node.progress.current / node.progress.target) * 100)) : null;
  return (
    <div className="relative rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-line">
      <div className="flex items-start justify-between gap-2"><div className="grid size-8 place-items-center rounded-xl bg-accent text-white"><Icon className="size-4" /></div><Badge tone={statusTone[node.status]}>{statusLabel[node.status]}</Badge></div>
      <div className="mt-3 flex items-baseline gap-2"><span className="text-[10px] font-medium text-faint tabular-nums">0{index + 1}</span><div className="text-[12.5px] font-semibold tracking-tight text-ink">{node.label}</div></div>
      <div className="mt-0.5 text-[11px] font-medium text-accent">{node.agent}</div>
      <div className="mt-2 min-h-8 text-[11px] leading-relaxed text-muted">{node.purpose}</div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11px]"><span className="font-medium text-ink-2">{node.signal}</span>{progress != null && <span className="text-faint tabular-nums">{progress}%</span>}</div>
      {progress != null && <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}

function ContractRow({ node }: { node: ResearchNodeSnapshot }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" /><span className="text-[12.5px] font-medium text-ink">{node.label}</span></div><Badge tone={statusTone[node.status]}>{statusLabel[node.status]}</Badge></div>
      <div className="mt-2 grid gap-2 text-[11px] leading-relaxed text-muted sm:grid-cols-3"><div><span className="font-medium text-ink-2">Input</span><br />{node.input}</div><div><span className="font-medium text-ink-2">Output</span><br />{node.output}</div><div><span className="font-medium text-ink-2">Gate</span><br />{node.criterion}</div></div>
      <div className="mt-2 text-[11px] text-accent">{node.detail}</div>
    </div>
  );
}

function FlowConnector() { return <div className="flex justify-center py-1 text-accent/60"><ArrowDown className="size-4" /></div>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-line"><div className="text-[10.5px] text-muted">{label}</div><div className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink tabular-nums">{value}</div><div className="text-[10.5px] text-faint">{detail}</div></div>; }
