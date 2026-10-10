import { ArrowRight, BrainCircuit, Database, GitBranch, Network, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import type { SamplePlan } from "@/lib/engine/sampling";

export function AgentGraph({ plan }: { plan: SamplePlan }) {
  const teams = plan.teams.slice(0, 3);
  const remainingTeams = Math.max(0, plan.teams.length - teams.length);

  return (
    <Card className="mt-4 overflow-hidden border border-accent/15 bg-[#fbfaff] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="size-4 text-accent" />
            <h3 className="text-[16px] font-semibold tracking-tight">How the research runs</h3>
          </div>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            One coordinator opens parallel employee sessions. Each agent stays focused on one person; the company layer only receives structured evidence and quoted examples.
          </p>
        </div>
        <Badge tone="accent">parallel discovery</Badge>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-[960px] items-center gap-2">
          <GraphNode icon={<Network className="size-4" />} title="Research lead" body="Sample + invite" />
          <GraphEdge />
          <div className="relative grid flex-[1.5] grid-cols-3 gap-2 rounded-2xl border border-dashed border-accent/25 bg-white/60 p-2.5 pt-6">
            <span className="absolute top-2 left-3 text-[10px] font-medium tracking-wide text-accent uppercase">Interview agents · one session per employee</span>
            {teams.map((team) => (
              <div key={team.team} className="rounded-xl bg-accent-soft/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <UsersRound className="size-3.5 text-accent" />
                  <span className="text-[11px] font-medium text-accent tabular-nums">
                    {team.completed}/{team.target}
                  </span>
                </div>
                <div className="mt-3 truncate text-[12.5px] font-semibold text-ink">{team.team}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted">Adaptive chat · 8 min</div>
              </div>
            ))}
            {remainingTeams > 0 && <div className="col-span-3 text-[11px] text-muted">+ {remainingTeams} more team{remainingTeams === 1 ? "" : "s"} in the wave</div>}
          </div>
          <GraphEdge />
          <GraphNode icon={<Database className="size-4" />} title="Evidence layer" body="Quotes + work map" />
          <GraphEdge />
          <GraphNode icon={<BrainCircuit className="size-4" />} title="Company brain" body="Patterns across teams" />
          <GraphEdge />
          <GraphNode icon={<GitBranch className="size-4" />} title="Roadmap" body="Jev prioritizes" />
        </div>
      </div>
    </Card>
  );
}

function GraphNode({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="w-[132px] shrink-0 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line">
      <div className="grid size-8 place-items-center rounded-xl bg-accent text-white">{icon}</div>
      <div className="mt-3 text-[12.5px] font-semibold tracking-tight text-ink">{title}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{body}</div>
    </div>
  );
}

function GraphEdge() {
  return (
    <div className="flex shrink-0 items-center text-accent/60">
      <div className="h-px w-5 bg-accent/25" />
      <ArrowRight className="size-3.5" />
    </div>
  );
}
