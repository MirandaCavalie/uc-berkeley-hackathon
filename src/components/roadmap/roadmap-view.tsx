"use client";

import { ClipboardCopy, Map as MapIcon, Printer, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { JevStamp } from "@/components/shared";
import { Button, Card, Empty, PageHeader, SectionTitle, Skeleton, SolutionBadge, Stat } from "@/components/ui";
import { discoveryStats } from "@/lib/engine/interview";
import { money, otherProcess, phaseMeta, roadmap, type RoadmapPhase } from "@/lib/engine/opportunities";
import { blueprint, processByName, solutionMeta } from "@/lib/engine/processes";
import { useHydrated, useStore } from "@/lib/store";
import type { Opportunity } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";

const planFor = (o: Opportunity) => blueprint(processByName(o.process) ?? otherProcess, o.solution, o.tools, o.teams);

export function RoadmapView() {
  const { opportunities, analysis, completed } = useDecisions();
  const hydrated = useHydrated();
  const interviews = useStore((s) => s.interviews);
  const company = useStore((s) => s.workspace.company);
  const hourlyCost = useStore((s) => s.roi.hourlyCost);
  const phases = roadmap(opportunities);
  const build = phases.filter((p) => p.phase !== "keep");
  const keep = phases.find((p) => p.phase === "keep")!;
  const stats = discoveryStats(interviews);
  const hours = build.reduce((n, p) => n + p.recoverableHours, 0);
  const value = build.reduce((n, p) => n + p.annualValue, 0);
  const initiatives = build.reduce((n, p) => n + p.items.length, 0);

  function copy() {
    navigator.clipboard?.writeText(markdown(company, phases, stats.completed, hours, value));
    toast("Roadmap copied as Markdown");
  }

  if (!hydrated)
    return (
      <div>
        <PageHeader title="AI roadmap" />
        <Skeleton className="mb-8 h-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );

  if (!completed)
    return (
      <div>
        <PageHeader title="AI roadmap" />
        <Empty icon={<MapIcon className="size-5" />} title="No roadmap yet">
          The roadmap is built from discovery interviews and Jev&apos;s decisions. Start in Discovery.
        </Empty>
      </div>
    );

  return (
    <div>
      <PageHeader
        title="AI roadmap"
        actions={
          <>
            <Button icon={<ClipboardCopy className="size-4" />} onClick={copy}>
              Copy as Markdown
            </Button>
            <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <section className="mb-8">
        <Card className="overflow-hidden">
          <div className="bg-accent px-6 py-5 text-white">
            <div className="text-[12.5px] text-white/70">{company}</div>
            <div className="mt-1 max-w-3xl text-[20px] leading-snug font-semibold tracking-tight">
              {initiatives} AI initiatives that give back {hours.toLocaleString()} hours a month, starting with {phases[0].items.length} quick wins
              this month.
            </div>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-4">
            <Stat label="Hours back per month" value={hours.toLocaleString()} tone="accent" />
            <Stat label="Annual value" value={money(value)} sub={`at $${hourlyCost}/h loaded cost`} />
            <Stat label="Initiatives" value={initiatives} sub={`+ ${keep.items.length} kept human`} />
            <Stat label="Built from" value={`${stats.completed} interviews`} sub={`${stats.teams} teams${stats.days ? ` in ${stats.days} days` : ""}`} />
          </div>
          <div className="border-t border-line px-6 py-3">
            {analysis ? (
              <JevStamp judgments={analysis.judgments} createdAt={analysis.createdAt} warning={analysis.warning} />
            ) : (
              <span className="text-[12px] text-muted">
                Rule-based draft.{" "}
                <Link href="/opportunities" className="font-medium text-accent hover:underline">
                  Run Jev in Opportunities
                </Link>{" "}
                to decide each initiative.
              </span>
            )}
          </div>
        </Card>
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-3">
        {build.map((p) => (
          <PhaseColumn key={p.phase} phase={p} />
        ))}
      </section>

      {keep.items.length > 0 && (
        <section className="mb-10">
          <SectionTitle title="Kept human" meta="AI only prepares the information" />
          <div className="grid gap-2 md:grid-cols-2">
            {keep.items.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold tracking-tight">{o.process}</span>
                  <span className="text-[12.5px] text-muted tabular-nums">{o.hoursPerMonth} h/mo</span>
                </div>
                {o.keepHuman[0] && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                    “{o.keepHuman[0].text}” <span className="text-muted">({o.keepHuman[0].person})</span>
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <Card className="flex flex-wrap items-start gap-4 p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <RefreshCcw className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Then interview again</div>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
              In 90 days, the same people answer the same questions. The hours they report against each quick win show what actually came back, and
              the next round of opportunities comes from what changed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {phases[0].items.map((o) => (
                <span key={o.id} className="rounded-md bg-sunken px-2 py-1 text-[12px] text-ink-2">
                  {o.process}: {planFor(o).metric.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <Link href="/discovery" className="pressable inline-flex h-9 items-center rounded-lg bg-surface px-3.5 text-[13.5px] font-medium shadow-card hover:bg-[#fbfaf7]">
            Discovery
          </Link>
        </Card>
      </section>
    </div>
  );
}

function PhaseColumn({ phase: p }: { phase: RoadmapPhase }) {
  const meta = phaseMeta[p.phase];
  return (
    <div className="rounded-xl bg-sunken/60 p-3">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <div>
          <div className="text-[14px] font-semibold">{meta.label}</div>
          <div className="text-[12px] text-muted">{meta.window}</div>
        </div>
        <div className="text-right text-[12px] text-muted tabular-nums">
          <div className="font-medium text-ink">{p.recoverableHours} h/mo</div>
          {money(p.annualValue)}/yr
        </div>
      </div>
      <div className="space-y-2">
        {p.items.length === 0 && <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-[12.5px] text-faint">Nothing here yet</div>}
        {p.items.map((o) => (
          <Card key={o.id} className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13.5px] leading-snug font-semibold tracking-tight">{o.process}</span>
              <SolutionBadge solution={o.solution} />
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{planFor(o).headline}</p>
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted">
              <span className="truncate">{o.teams.join(", ")}</span>
              <span className="shrink-0 tabular-nums">{o.recoverableHours} h/mo back</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function markdown(company: string, phases: RoadmapPhase[], interviews: number, hours: number, value: number): string {
  const lines = [`# ${company}: AI roadmap`, "", `Built from ${interviews} employee interviews. ${hours} hours a month back, about ${money(value)} a year.`, ""];
  for (const p of phases) {
    if (!p.items.length) continue;
    const meta = phaseMeta[p.phase];
    lines.push(`## ${meta.label} (${meta.window})`, "");
    for (const o of p.items) {
      const plan = planFor(o);
      lines.push(
        `- **${o.process}**: ${solutionMeta[o.solution].label}. ${plan.headline}` +
          (o.solution === "human" ? "" : ` ${o.recoverableHours} h/mo back. Checkpoint: ${plan.checkpoint} Measure: ${plan.metric}.`),
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
