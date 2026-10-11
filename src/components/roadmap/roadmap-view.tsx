"use client";

import clsx from "clsx";
import { ClipboardCopy, Map as MapIcon, Printer, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Card, Empty, PageHeader, SectionTitle, Skeleton, SolutionBadge } from "@/components/ui";
import { discoveryStats } from "@/lib/engine/interview";
import { money, otherProcess, phaseMeta, roadmap, type RoadmapPhase } from "@/lib/engine/opportunities";
import { blueprint, processByName, solutionMeta } from "@/lib/engine/processes";
import { useHydrated, useStore } from "@/lib/store";
import type { Opportunity } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";

const planFor = (o: Opportunity) => blueprint(processByName(o.process) ?? otherProcess, o.solution, o.tools, o.teams);

export function RoadmapView() {
  const { opportunities, completed } = useDecisions();
  const hydrated = useHydrated();
  const interviews = useStore((s) => s.interviews);
  const company = useStore((s) => s.workspace.company);
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
        <Skeleton className="mb-10 h-24" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
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

      <section className="mb-10">
        <Card className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          {[
            { label: "Hours back / month", value: hours.toLocaleString() },
            { label: "Annual value", value: money(value) },
            { label: "Initiatives", value: initiatives },
            { label: "Interviews", value: stats.completed },
          ].map((s) => (
            <div key={s.label} className="px-6 py-5">
              <div className="text-[12.5px] text-muted">{s.label}</div>
              <div className="mt-1 text-[28px] leading-none font-semibold tracking-tight text-ink tabular-nums">{s.value}</div>
            </div>
          ))}
        </Card>
      </section>

      <section className="mb-10">
        <SectionTitle title="The plan" />
        <ol className="relative">
          {build.map((p, i) => (
            <Phase key={p.phase} phase={p} last={i === build.length - 1} />
          ))}
        </ol>
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

function Phase({ phase: p, last }: { phase: RoadmapPhase; last: boolean }) {
  const meta = phaseMeta[p.phase];
  const first = p.phase === "now";
  return (
    <li className="relative grid gap-4 pb-8 pl-8 md:grid-cols-[180px_1fr] md:gap-8">
      {!last && <span className="absolute top-5 bottom-0 left-[7px] w-px bg-line-strong" />}
      <span
        className={clsx(
          "absolute top-1 left-0 size-[15px] rounded-full border-2",
          first ? "border-accent bg-accent" : "border-line-strong bg-surface",
        )}
      />
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-ink">{meta.label}</div>
        <div className="text-[12.5px] text-muted">{meta.window}</div>
        <div className="mt-3 text-[20px] leading-none font-semibold tracking-tight tabular-nums">{p.recoverableHours} h/mo</div>
        <div className="mt-1 text-[12.5px] text-muted tabular-nums">{money(p.annualValue)}/yr</div>
      </div>
      {p.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[12.5px] text-faint">Nothing here yet</div>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {p.items.map((o) => (
            <div key={o.id} className="flex items-start gap-4 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold tracking-tight">{o.process}</span>
                  <SolutionBadge solution={o.solution} />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{planFor(o).headline}</p>
              </div>
              <div className="shrink-0 text-right text-[13px] font-semibold tabular-nums">
                {o.recoverableHours} <span className="font-normal text-muted">h/mo</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </li>
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
