"use client";

import clsx from "clsx";
import { AlertCircle, ArrowRight, Check, ChevronDown, Scale, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NextStep } from "@/components/app-shell";
import { Badge, Button, Card, Empty, PageHeader, SectionTitle, Skeleton, SolutionBadge } from "@/components/ui";
import { dimensions, money, otherProcess, phaseMeta } from "@/lib/engine/opportunities";
import { blueprint, processByName, solutionMeta } from "@/lib/engine/processes";
import { useHydrated, useStore } from "@/lib/store";
import type { Dimension, Opportunity, Phase, Solution } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";

const solutions: Solution[] = ["automation", "skill", "agent", "human"];
const solutionBar: Record<Solution, string> = { automation: "bg-automation", skill: "bg-skill", agent: "bg-agent", human: "bg-human" };
const solutionPlain: Record<Solution, string> = {
  automation: "Runs on its own, no judgment needed",
  skill: "A person asks AI for a draft, then edits it",
  agent: "AI works the queue and asks a person when unsure",
  human: "Stays with people",
};
const phaseTone: Record<Phase, "accent" | "neutral" | "human"> = { now: "accent", next: "neutral", later: "neutral", keep: "human" };
const reasons: Record<Dimension, { good: string; bad: string }> = {
  feasibility: { good: "AI already does this kind of work well", bad: "AI struggles with this kind of work" },
  dataReadiness: { good: "The data it needs is already in place", bad: "The data needs cleanup first" },
  adoption: { good: "The team is asking for help here", bad: "The team is hesitant about changing this" },
  risk: { good: "A mistake here is cheap to catch", bad: "A mistake here would be costly" },
  effort: { good: "Quick to build", bad: "A big build" },
};

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
          {stale && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-lg bg-signal-soft px-3 py-2 text-[12.5px] text-ink-2">
              New interviews came in since this run.
              <Button size="sm" variant="secondary" onClick={run} loading={running}>
                Re-run
              </Button>
            </div>
          )}

          <section className="mb-10">
            <Summary opportunities={opportunities} />
          </section>

          <section className="mb-10">
            <SectionTitle title="Where to start" meta={opportunities.length} />
            <div className="space-y-2">
              {opportunities.map((o, i) => (
                <OpportunityCard key={o.id} opportunity={o} rank={i + 1} defaultOpen={i === 0} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Summary({ opportunities }: { opportunities: Opportunity[] }) {
  const ai = opportunities.filter((o) => o.solution !== "human");
  const hours = ai.reduce((n, o) => n + o.recoverableHours, 0);
  const value = ai.reduce((n, o) => n + o.annualValue, 0);
  const kept = opportunities.length - ai.length;
  const groups = solutions
    .map((s) => {
      const items = opportunities.filter((o) => o.solution === s);
      return { s, count: items.length, hours: items.reduce((n, o) => n + (s === "human" ? o.hoursPerMonth : o.recoverableHours), 0) };
    })
    .filter((g) => g.count > 0);
  const barTotal = groups.reduce((n, g) => n + g.hours, 0) || 1;

  return (
    <Card className="p-5">
      <p className="text-[15px] leading-relaxed text-ink-2">
        Your team described <span className="font-semibold text-ink">{opportunities.length} kinds of work</span>. AI can give back about{" "}
        <span className="font-semibold text-ink tabular-nums">{hours} hours a month</span>, worth{" "}
        <span className="font-semibold text-ink tabular-nums">{money(value)} a year</span>
        {kept > 0 && `, and ${kept} should stay with people`}.
      </p>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-sunken">
        {groups.map((g) => (
          <span key={g.s} className={solutionBar[g.s]} style={{ width: `${(g.hours / barTotal) * 100}%` }} />
        ))}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.s} className="flex items-start gap-2.5">
            <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", solutionBar[g.s])} />
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-ink">
                {solutionMeta[g.s].label} <span className="font-normal text-muted">· {g.count}</span>
              </dt>
              <dd className="text-[12.5px] text-muted">
                {solutionPlain[g.s]}. {g.s === "human" ? `${g.hours} h/mo` : `${g.hours} h/mo back`}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function OpportunityCard({ opportunity: o, rank, defaultOpen }: { opportunity: Opportunity; rank: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const overridden = useStore((s) => s.overrides[o.id]);
  const override = useStore((s) => s.override);
  const def = processByName(o.process) ?? otherProcess;
  const plan = blueprint(def, o.solution, o.tools, o.teams);
  const quotes = o.tasks.filter((t) => t.pain).slice(0, 2);
  const human = o.solution === "human";
  const teams = o.teams.length > 2 ? `${o.teams.slice(0, 2).join(", ")} +${o.teams.length - 2}` : o.teams.join(", ");
  const why = dimensions
    .map((d) => {
      const good = d.inverted ? 6 - o.scores[d.key] : o.scores[d.key];
      return good >= 4 ? { good: true, text: reasons[d.key].good } : good <= 2 ? { good: false, text: reasons[d.key].bad } : null;
    })
    .filter((r): r is { good: boolean; text: string } => r !== null)
    .sort((a, b) => Number(b.good) - Number(a.good));

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[13px] font-semibold text-ink-2 tabular-nums">{rank}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{o.process}</span>
            <SolutionBadge solution={o.solution} />
            {overridden && <Badge>Changed by you</Badge>}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">
            {teams} · {o.people.length} {o.people.length === 1 ? "person" : "people"}
          </div>
        </div>
        <Badge tone={phaseTone[o.phase]} className="hidden sm:inline-flex">
          {phaseMeta[o.phase].label}
        </Badge>
        <div className="hidden w-28 text-right md:block">
          <div className="text-[14px] font-semibold tabular-nums">{human ? `${o.hoursPerMonth} h/mo` : `${o.recoverableHours} h/mo back`}</div>
          <div className="text-[12px] text-muted tabular-nums">{human ? "stays with people" : `${money(o.annualValue)}/yr`}</div>
        </div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="enter grid gap-6 border-t border-line p-5 md:grid-cols-[1.1fr_1fr] md:pl-[64px]">
          <div>
            <div className="mb-2 text-[12px] font-medium text-muted">{human ? "Why it stays human" : "What to build"}</div>
            <div className="text-[14px] leading-snug font-medium text-ink">{plan.headline}</div>
            <ol className="mt-3 space-y-1.5">
              {plan.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                  <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-sunken text-[10.5px] font-semibold text-muted">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
              <span className="font-medium text-human">A person still: </span>
              {plan.checkpoint}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
              Wrong type?
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

          <div className="space-y-5">
            {why.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-muted">Why it ranks #{rank}</div>
                <ul className="space-y-1.5">
                  {why.map((r) => (
                    <li key={r.text} className="flex items-start gap-2 text-[13px] text-ink-2">
                      {r.good ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-good" />
                      ) : (
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warn" />
                      )}
                      {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(quotes.length > 0 || o.keepHuman.length > 0) && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-muted">What people said</div>
                <div className="space-y-1.5">
                  {quotes.map((t) => (
                    <figure key={t.id} className="rounded-lg bg-sunken/60 px-3 py-2">
                      <blockquote className="text-[12.5px] leading-relaxed text-ink-2">“{t.pain}”</blockquote>
                      <figcaption className="mt-0.5 text-[11px] text-muted">
                        {t.person}, {t.role} · {t.hoursPerWeek} h/wk
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
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
