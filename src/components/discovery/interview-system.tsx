"use client";

import { Check, Clipboard, GitBranch, Mail, Radio, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, SectionTitle, Stat } from "@/components/ui";
import { INTERVIEW_AGENT } from "@/lib/engine/interview-agent";
import { buildSamplePlan, sampleBrief } from "@/lib/engine/sampling";
import { defaultRoi } from "@/lib/engine/opportunities";
import { useStore } from "@/lib/store";
import type { Interview } from "@/lib/types";

const systemSteps = [
  { icon: ScanSearch, title: "Sample the teams", body: "Set a target per team before the first invite." },
  { icon: Radio, title: "Run the agent", body: "An adaptive eight-minute conversation follows the work." },
  { icon: GitBranch, title: "Capture evidence", body: "Turn answers into tasks, time, tools, blockers, and boundaries." },
  { icon: Check, title: "Review the roadmap", body: "Jev ranks opportunities only after people can correct the record." },
];

export function InterviewSystem({ interviews }: { interviews: Interview[] }) {
  const workspace = useStore((s) => s.workspace);
  const plan = buildSamplePlan(workspace, interviews, defaultRoi.hourlyCost);

  function copyBrief() {
    navigator.clipboard?.writeText(sampleBrief(workspace.company, plan));
    toast.success("Sample wave brief copied", { description: "Use it to recruit the next people from each team." });
  }

  return (
    <section className="mb-10">
      <SectionTitle
        title="Interview system"
        meta="the agent behind discovery"
        action={
          <Badge tone="accent">
            <span className="size-1.5 rounded-full bg-current" />
            {INTERVIEW_AGENT.version}
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent text-white">
                  <Radio className="size-4" />
                </span>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight">{INTERVIEW_AGENT.name}</h3>
                  <p className="text-[12px] text-muted">Adaptive discovery, evidence first</p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
                The agent asks about the work people repeat, follows vague answers with a concrete example, and produces a record the employee can review. It does not decide what to automate while it is interviewing.
              </p>
            </div>
            <div className="rounded-xl bg-accent-soft px-3 py-2 text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-accent">Live in this demo</div>
              <div className="mt-0.5 text-[13px] text-ink-2">Chat · parser · review</div>
            </div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {systemSteps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-xl border border-line bg-paper/60 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-accent shadow-card">
                  <step.icon className="size-3.5" />
                </span>
                <div>
                  <div className="text-[13px] font-medium">
                    <span className="mr-1.5 text-faint tabular-nums">0{index + 1}</span>
                    {step.title}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold tracking-tight">Sample plan</h3>
              <p className="mt-0.5 text-[12px] text-muted">95% confidence · roughly ±10% precision</p>
            </div>
            <Mail className="size-4 text-accent" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Target" value={plan.target} sub={`of ${plan.population}`} tone="accent" />
            <Stat label="Complete" value={plan.completed} sub={`${plan.remaining} remaining`} />
            <Stat label="Cost" value={`$${plan.estimatedCost.toLocaleString()}`} sub={`at $${defaultRoi.hourlyCost}/h`} />
          </div>
          <div className="mt-5 space-y-3">
            {plan.teams.map((team) => {
              const progress = Math.min(100, Math.round((team.completed / Math.max(team.target, 1)) * 100));
              return (
                <div key={team.team}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-medium text-ink-2">{team.team}</span>
                    <span className="text-muted tabular-nums">
                      {team.completed}/{team.target}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="mt-5 w-full" variant="secondary" icon={<Clipboard className="size-3.5" />} onClick={copyBrief}>
            Copy next invite brief
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-faint">
            The demo prepares the wave and starts interviews in-app. Email delivery is the next integration layer.
          </p>
        </Card>
      </div>
    </section>
  );
}
