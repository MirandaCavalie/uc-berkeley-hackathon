"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, Scale, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NextStep } from "@/components/app-shell";
import { Confidence, JevStamp } from "@/components/shared";
import { Badge, Button, Card, Empty, Input, PageHeader, ScoreRing, SectionTitle, Skeleton, SolutionBadge } from "@/components/ui";
import { dimensions, money, otherProcess, phaseMeta } from "@/lib/engine/opportunities";
import { blueprint, processByName, solutionMeta } from "@/lib/engine/processes";
import { useHydrated, useStore } from "@/lib/store";
import type { Opportunity, Solution } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";

const solutions: Solution[] = ["automation", "skill", "agent", "human"];
const solutionBar: Record<Solution, string> = { automation: "bg-automation", skill: "bg-skill", agent: "bg-agent", human: "bg-human" };

export function OpportunitiesView() {
  const { opportunities, analysis, stale, running, run, completed } = useDecisions();
  const hydrated = useHydrated();
  const autoRan = useRef(false);

  useEffect(() => {
    if (!hydrated || autoRan.current || analysis || !completed) return;
    autoRan.current = true;
    run();
  }, [hydrated, analysis, completed, run]);

  return (
    <div>
      <PageHeader
        title="Opportunities"
        actions={
          <>
            <Button onClick={run} loading={running} disabled={!completed} icon={<Scale className="size-4" />}>
              {analysis ? "Re-run Jev" : "Decide with Jev"}
            </Button>
            {analysis && (
              <NextStep
                href="/roadmap"
                label={
                  <>
                    See the roadmap <ArrowRight className="size-3.5" />
                  </>
                }
              />
            )}
          </>
        }
      />

      {!completed ? (
        <Empty icon={<Scale className="size-5" />} title="Nothing to decide yet">
          Opportunities come from discovery interviews. Complete at least one in Discovery.
        </Empty>
      ) : !hydrated || (running && !analysis) ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : (
        <>
          {analysis && (
            <div className="mb-6 space-y-2">
              <JevStamp judgments={analysis.judgments} createdAt={analysis.createdAt} warning={analysis.warning} />
              {stale && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-signal-soft px-3 py-2 text-[12.5px] text-ink-2">
                  New interviews came in since this run.
                  <Button size="sm" variant="secondary" onClick={run} loading={running}>
                    Re-run
                  </Button>
                </div>
              )}
            </div>
          )}

          <section className="mb-10">
            <SolutionMix opportunities={opportunities} />
          </section>

          <section className="mb-10">
            <SectionTitle title="Ranked by priority" meta={opportunities.length} />
            <div className="space-y-2">
              {opportunities.map((o, i) => (
                <OpportunityCard key={o.id} opportunity={o} rank={i + 1} defaultOpen={i === 0} />
              ))}
            </div>
          </section>

          <Assumptions />
        </>
      )}
    </div>
  );
}

function SolutionMix({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {solutions.map((s) => {
        const items = opportunities.filter((o) => o.solution === s);
        const hours = items.reduce((n, o) => n + (s === "human" ? o.hoursPerMonth : o.recoverableHours), 0);
        return (
          <Card key={s} className="p-4">
            <div className="flex items-center justify-between">
              <SolutionBadge solution={s} />
              <span className="text-[22px] font-semibold tabular-nums">{items.length}</span>
            </div>
            <div className="mt-2 text-[12.5px] text-muted">
              {s === "human" ? `${hours} h/mo protected` : `${hours} h/mo recoverable`}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-faint">{solutionMeta[s].short}</p>
          </Card>
        );
      })}
    </div>
  );
}

function OpportunityCard({ opportunity: o, rank, defaultOpen }: { opportunity: Opportunity; rank: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const judgments = useStore((s) => s.analysis?.judgments);
  const overridden = useStore((s) => s.overrides[o.id]);
  const override = useStore((s) => s.override);
  const solutionJudgment = judgments?.items[`solution:${o.id}`];
  const def = processByName(o.process) ?? otherProcess;
  const plan = blueprint(def, o.solution, o.tools, o.teams);
  const quotes = o.tasks.filter((t) => t.pain).slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="w-5 text-center text-[13px] font-medium text-faint tabular-nums">{rank}</div>
        {o.solution === "human" ? (
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-human-soft text-[11px] font-medium text-human">Human</div>
        ) : (
          <ScoreRing value={o.priority} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{o.process}</span>
            <SolutionBadge solution={o.solution} />
            {overridden ? <Badge>Changed by you</Badge> : solutionJudgment && <Confidence judgment={solutionJudgment} />}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">
            {o.teams.join(", ")} · {o.people.length} {o.people.length === 1 ? "person" : "people"} · {phaseMeta[o.phase].label}
          </div>
        </div>
        <div className="hidden text-right md:block">
          <div className="text-[14px] font-semibold tabular-nums">{o.solution === "human" ? `${o.hoursPerMonth} h/mo` : `${o.recoverableHours} h/mo back`}</div>
          <div className="text-[12px] text-muted tabular-nums">{o.solution === "human" ? "stays with people" : `${money(o.annualValue)}/yr of ${o.hoursPerMonth} h/mo`}</div>
        </div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="enter grid gap-6 border-t border-line p-5 md:grid-cols-[1fr_1.1fr] md:pl-[60px]">
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[12px] font-medium text-muted">Readiness, scored by Jev</div>
              <div className="space-y-1.5">
                {dimensions.map((d) => {
                  const v = o.scores[d.key];
                  const j = judgments?.items[`score:${o.id}:${d.key}`];
                  return (
                    <div key={d.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[12.5px]">
                      <span className="text-ink-2">{d.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={clsx("h-1.5 flex-1 rounded-full", n <= v ? (d.inverted ? "bg-signal" : "bg-accent") : "bg-sunken")}
                          />
                        ))}
                      </div>
                      <span className="flex w-14 justify-end">{j ? <Confidence judgment={j} /> : <span className="text-[11px] text-faint">rule</span>}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-medium text-muted">What people said</div>
              <div className="space-y-1.5">
                {quotes.map((t) => (
                  <figure key={t.id} className="rounded-lg bg-sunken/60 px-3 py-2">
                    <blockquote className="text-[12.5px] leading-relaxed text-ink-2">“{t.pain}”</blockquote>
                    <figcaption className="mt-0.5 text-[11px] text-muted">
                      {t.person}, {t.role} · {t.name}, {t.hoursPerWeek} h/wk
                    </figcaption>
                  </figure>
                ))}
                {o.keepHuman.map((k) => (
                  <div key={k.person} className="rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
                    <span className="font-medium text-human">{k.person}:</span> “{k.text}”
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className={clsx("rounded-xl p-4", o.solution === "human" ? "bg-human-soft/50" : "bg-paper")}>
              <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-muted">
                <span className={clsx("size-1.5 rounded-full", solutionBar[o.solution])} />
                {solutionMeta[o.solution].label} blueprint
              </div>
              <div className="text-[14px] leading-snug font-medium text-ink">{plan.headline}</div>
              <ol className="mt-3 space-y-1.5">
                {plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                    <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-surface text-[10.5px] font-semibold text-muted shadow-card">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-3 rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
                <span className="font-medium text-human">Human checkpoint: </span>
                {plan.checkpoint}
              </div>
              <div className="mt-2 text-[12px] text-muted">
                <span className="font-medium text-ink-2">Measure: </span>
                {plan.metric}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
              Wrong call?
              <select
                value={o.solution}
                onChange={(e) => override(o.id, e.target.value as Solution)}
                aria-label={`Solution type for ${o.process}`}
                className="h-7 rounded-md bg-surface px-2 text-[12.5px] text-ink shadow-[0_0_0_1px_var(--color-line-strong)] outline-none"
              >
                {solutions.map((s) => (
                  <option key={s} value={s}>
                    {solutionMeta[s].label}
                  </option>
                ))}
              </select>
              {overridden && (
                <button type="button" onClick={() => override(o.id, null)} className="pressable inline-flex items-center gap-1 text-accent hover:underline">
                  <Undo2 className="size-3.5" /> Use Jev&apos;s call
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Assumptions() {
  const roi = useStore((s) => s.roi);
  const setRoi = useStore((s) => s.setRoi);
  const setCapture = (s: Solution, v: number) => setRoi({ capture: { ...roi.capture, [s]: Math.min(100, Math.max(0, v)) / 100 } });
  const fields = [
    { label: "Loaded hourly cost", value: roi.hourlyCost, onChange: (v: number) => setRoi({ hourlyCost: v }), unit: "$/h" },
    ...(["automation", "agent", "skill"] as Solution[]).map((s) => ({
      label: `${solutionMeta[s].label} saves`,
      value: Math.round(roi.capture[s] * 100),
      onChange: (v: number) => setCapture(s, v),
      unit: "% of time",
    })),
  ];
  return (
    <div className="rounded-xl bg-sunken/70 p-4">
      <div className="mb-3 text-[12.5px] font-medium text-ink-2">Assumptions</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <label key={f.label} className="block">
            <span className="mb-1 block text-[11.5px] text-muted">{f.label}</span>
            <span className="flex items-center gap-1.5">
              <Input type="number" min={0} value={f.value} onChange={(e) => f.onChange(Number(e.target.value))} className="h-8 tabular-nums" />
              <span className="text-[11.5px] whitespace-nowrap text-faint">{f.unit}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        Hours come from what people reported in interviews (hours per week × 4.33). Work kept human counts as zero. Priority weighs value at 35% and Jev&apos;s readiness scores at 65%.
      </p>
    </div>
  );
}
