"use client";

import { ArrowRight, Clipboard, GitBranch, Mail, Radio, Route, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Stat } from "@/components/ui";
import { INTERVIEW_AGENT } from "@/lib/engine/interview-agent";
import { buildSamplePlan, sampleBrief } from "@/lib/engine/sampling";
import { defaultRoi } from "@/lib/engine/opportunities";
import { useStore } from "@/lib/store";
import type { Interview } from "@/lib/types";
import { AgentGraph } from "./agent-graph";

export function InterviewSystem({ interviews, onOpen }: { interviews: Interview[]; onOpen: (id: string) => void }) {
  const workspace = useStore((s) => s.workspace);
  const plan = buildSamplePlan(workspace, interviews, defaultRoi.hourlyCost);
  const nextInterview = interviews.find((interview) => interview.status === "in-progress") ?? interviews.find((interview) => interview.status === "invited");

  function copyBrief() {
    navigator.clipboard?.writeText(sampleBrief(workspace.company, plan));
    toast.success("Interview plan copied", { description: "Use it to recruit the next people from each team." });
  }

  return (
    <section className="mb-10">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-white">
                  <Radio className="size-4" />
                </span>
                <div>
                  <h2 className="text-[17px] font-semibold tracking-tight">{INTERVIEW_AGENT.name}</h2>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
                    <span className="size-1.5 rounded-full bg-good" /> {INTERVIEW_AGENT.version} · ready
                  </div>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-[14px] leading-6 text-ink-2">Runs a bounded interview, turns answers into a traceable work record, and asks for missing evidence before it moves on.</p>
            </div>
            <div>
              <div className="grid gap-2 sm:grid-cols-3">
                <RuntimeFact icon={GitBranch} label="Runtime" value="LangGraph" />
                <RuntimeFact icon={Route} label="Routing" value="Jev + guardrails" />
                <RuntimeFact icon={Save} label="Checkpoint" value="Every turn" />
              </div>
              {nextInterview && (
                <Button className="mt-4" variant="accent" onClick={() => onOpen(nextInterview.id)} icon={<ArrowRight className="size-3.5" />}>
                  {nextInterview.status === "in-progress" ? `Continue ${nextInterview.name}` : `Interview ${nextInterview.name}`}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight">Interview coverage</h2>
              <p className="mt-1 text-[12px] text-muted">95% confidence target · ±10% margin</p>
            </div>
            <Mail className="size-4 text-accent" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Target" value={plan.target} sub={`of ${plan.population}`} tone="accent" />
            <Stat label="Complete" value={plan.completed} sub={`${plan.remaining} remaining`} />
            <Stat label="Budget" value={`$${plan.estimatedCost.toLocaleString()}`} sub={`at $${defaultRoi.hourlyCost}/h`} />
          </div>
          <div className="mt-5 space-y-3">
            {plan.teams.map((team) => {
              const progress = Math.min(100, Math.round((team.completed / Math.max(team.target, 1)) * 100));
              return (
                <div key={team.team}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-medium text-ink-2">{team.team}</span>
                    <span className="text-muted tabular-nums">{team.completed}/{team.target}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="mt-5 w-full" variant="secondary" icon={<Clipboard className="size-3.5" />} onClick={copyBrief}>
            Copy interview plan
          </Button>
        </Card>
      </div>
      <AgentGraph interviews={interviews} />
    </section>
  );
}

function RuntimeFact({ icon: Icon, label, value }: { icon: typeof GitBranch; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/55 p-3">
      <Icon className="size-3.5 shrink-0 text-accent" />
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">{label}</div>
        <div className="mt-0.5 text-[12px] font-semibold text-ink">{value}</div>
      </div>
    </div>
  );
}
