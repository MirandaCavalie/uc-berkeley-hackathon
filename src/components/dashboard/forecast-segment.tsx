"use client";

import clsx from "clsx";
import { ChevronRight, RotateCcw } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { Button, Card, Input, SectionTitle, SolutionBadge } from "@/components/ui";
import { defaultRoi, money } from "@/lib/engine/opportunities";
import { solutionMeta } from "@/lib/engine/processes";
import { BUILD_HOURS, MAX_EXTRAPOLATION, paybackLabel, RAMP, type AreaForecast, type OpportunityForecast, type Scenario } from "@/lib/engine/roi";
import { useStore } from "@/lib/store";
import type { Opportunity, RoiAssumptions, Solution } from "@/lib/types";
import { EvidenceMeter, hours, KindLabel, pct, signedMoney } from "./labels";
import { SegmentHeading, Sub } from "./today-segment";

const roiLabel = (s: Scenario) => (s.roi12 === null ? "—" : pct(s.roi12));

export function ForecastSegment({ areas, next, roi }: { areas: AreaForecast[]; next: { o: Opportunity; f: OpportunityForecast }[]; roi: RoiAssumptions }) {
  return (
    <section id="forecast" className="scroll-mt-6">
      <SegmentHeading eyebrow="Segment B · Prediction" title="Forecast: where AI will return" badge={<KindLabel kind="predicted" />}>
        We mapped the company and interviewed the people doing the work, so we can forecast the return by area before money is spent.
      </SegmentHeading>

      <div id="next" className="mb-10 scroll-mt-6">
        <SectionTitle title="Where to invest next" meta="Top 3 not started, by base-case 12-month net" />
        {next.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {next.map(({ o, f }) => (
              <InvestCard key={o.id} o={o} f={f} roi={roi} />
            ))}
          </div>
        ) : (
          <Card className="p-5 text-[13px] text-muted">Every opportunity on the roadmap is already live. Interview again to find the next round.</Card>
        )}
      </div>

      <div className="mb-10">
        <SectionTitle title="By area" meta={<span className="inline-flex items-center gap-2">Team, then process within team <KindLabel kind="predicted" /></span>} />
        <AreaTable areas={areas} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <AssumptionsPanel />
        <HowWeForecast roi={roi} />
      </div>
    </section>
  );
}

function InvestCard({ o, f, roi }: { o: Opportunity; f: OpportunityForecast; roi: RoiAssumptions }) {
  const quotes = o.tasks.filter((t) => t.pain.trim()).slice(0, 2);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-ink">{o.process}</div>
          <div className="mt-0.5 text-[12px] text-muted">{o.teams.join(", ")}</div>
        </div>
        <SolutionBadge solution={o.solution} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] text-muted">12-month net</div>
          <div className="text-[22px] font-semibold tracking-tight text-accent tabular-nums">{signedMoney(f.base.net12)}</div>
          <Sub kind="predicted">
            {signedMoney(f.low.net12)} to {signedMoney(f.high.net12)}
          </Sub>
        </div>
        <div>
          <div className="text-[12px] text-muted">Hours of capacity</div>
          <div className="text-[22px] font-semibold tracking-tight text-ink tabular-nums">{hours(f.base.monthlyHours)}/mo</div>
          <Sub kind="predicted">payback {paybackLabel(f.base.paybackMonth)} mo</Sub>
        </div>
      </div>

      <ul className="mt-4 space-y-1 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-2">
        <li>
          {hours(f.reportedHours)} h/mo reported by {f.evidence.people} {f.evidence.people === 1 ? "person" : "people"} <KindLabel kind="reported" />
        </li>
        <li>{basisText(f)}</li>
        <li>
          {pct(f.base.capture ?? 0)} capture ({solutionMeta[o.solution].label.toLowerCase()}) × {pct(f.base.adoption ?? 0)} adoption ceiling
        </li>
        <li>
          Build {f.buildHours} h × ${roi.builderRate} = {money(f.base.buildCost)} · run {money(f.base.monthlyRunCost)}/mo
        </li>
        <li className="pt-1">
          <EvidenceMeter {...f.evidence} />
        </li>
      </ul>

      {quotes.length > 0 && (
        <div className="mt-3 space-y-2">
          {quotes.map((q) => (
            <blockquote key={q.id + q.person} className="rounded-lg bg-sunken/70 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
              “{q.pain}” <span className="text-muted">({q.person}, {q.role})</span>
            </blockquote>
          ))}
        </div>
      )}
    </Card>
  );
}

function basisText(f: OpportunityForecast) {
  if (f.basis === "sample") return "Interview data only: add a team roster to estimate company-wide impact";
  return `Extrapolated from ${f.interviewed} of ${f.headcount.toLocaleString()} people${f.capped ? `, capped at ${MAX_EXTRAPOLATION}×` : ""}`;
}

function AreaTable({ areas }: { areas: AreaForecast[] }) {
  const shared = areas.some((a) => a.processes.some((p) => p.sharedBuild));
  const [open, setOpen] = useState<Set<string>>(() => new Set(areas.slice(0, 1).map((a) => a.team)));
  const toggle = (team: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-muted">
            <th className="px-4 py-2.5 font-medium">Area</th>
            <Th>Hours of capacity/mo</Th>
            <Th>Value/mo</Th>
            <Th>Build cost</Th>
            <Th>12-mo ROI</Th>
            <Th>Payback</Th>
            <Th>12-mo net · low / base / high</Th>
            <th className="px-4 py-2.5 font-medium">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <Fragment key={a.team}>
              <tr className="border-b border-line bg-sunken/40 font-medium text-ink">
                <td className="px-4 py-2.5">
                  <button type="button" aria-expanded={open.has(a.team)} onClick={() => toggle(a.team)} className="pressable inline-flex items-center gap-1.5 hover:text-accent">
                    <ChevronRight className={clsx("size-3.5 text-muted transition-transform", open.has(a.team) && "rotate-90")} />
                    {a.team}
                  </button>
                </td>
                <Num>{hours(a.base.monthlyHours)}</Num>
                <Num>{money(a.base.monthlyValue)}</Num>
                <Num>{money(a.base.buildCost)}</Num>
                <Num>{roiLabel(a.base)}</Num>
                <Num>{paybackLabel(a.base.paybackMonth)} mo</Num>
                <Num>
                  <Range s={[a.low, a.base, a.high]} />
                </Num>
                <td className="px-4 py-2.5 text-[12px] font-normal text-muted">{a.processes.length} {a.processes.length === 1 ? "process" : "processes"}</td>
              </tr>
              {open.has(a.team) && a.processes.map((p) => (
                <tr key={a.team + p.opportunityId} className="border-b border-line align-top last:border-0">
                  <td className="py-2.5 pr-4 pl-8">
                    <div className="flex items-center gap-2 text-ink">
                      {p.process}
                      <SolutionBadge solution={p.solution} />
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-faint">{basisText(p)}</div>
                  </td>
                  <Num>{hours(p.base.monthlyHours)}</Num>
                  <Num>{money(p.base.monthlyValue)}</Num>
                  <Num>
                    {money(p.base.buildCost)}
                    {p.sharedBuild && <span className="text-faint">†</span>}
                  </Num>
                  <Num>{roiLabel(p.base)}</Num>
                  <Num>{paybackLabel(p.base.paybackMonth)} mo</Num>
                  <Num>
                    <Range s={[p.low, p.base, p.high]} />
                  </Num>
                  <td className="px-4 py-2.5">
                    <EvidenceMeter {...p.evidence} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      {shared && (
        <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-faint">
          † Shared with another team. The full build cost is shown in each team, so don&apos;t add build costs across teams.
        </p>
      )}
    </Card>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-2.5 text-right font-medium">{children}</th>;
}

function Num({ children }: { children: ReactNode }) {
  return <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{children}</td>;
}

function Range({ s: [low, base, high] }: { s: [Scenario, Scenario, Scenario] }) {
  return (
    <span>
      <span className="text-faint">{signedMoney(low.net12)} / </span>
      <span className={clsx("font-medium", base.net12 < 0 ? "text-bad" : "text-ink")}>{signedMoney(base.net12)}</span>
      <span className="text-faint"> / {signedMoney(high.net12)}</span>
    </span>
  );
}

function AssumptionsPanel() {
  const roi = useStore((s) => s.roi);
  const setRoi = useStore((s) => s.setRoi);
  const num = (raw: string, max = Infinity) => {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
  };
  const setCeiling = (i: number, v: number) => {
    const next = [...roi.adoptionCeilings] as RoiAssumptions["adoptionCeilings"];
    next[i] = v / 100;
    setRoi({ adoptionCeilings: next });
  };
  const setRun = (s: Solution, v: number) => setRoi({ runCost: { ...roi.runCost, [s]: v } });
  const reset = () => setRoi({ hourlyCost: defaultRoi.hourlyCost, builderRate: defaultRoi.builderRate, adoptionCeilings: defaultRoi.adoptionCeilings, runCost: defaultRoi.runCost });

  return (
    <div className="rounded-xl bg-sunken/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12.5px] font-medium text-ink-2">Assumptions · edit to recompute everything</div>
        <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={reset}>
          Defaults
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumField label="Loaded hourly cost" unit="$/h" value={roi.hourlyCost} onChange={(v) => setRoi({ hourlyCost: num(v) })} />
        <NumField label="Builder rate" unit="$/h" value={roi.builderRate} onChange={(v) => setRoi({ builderRate: num(v) })} />
      </div>
      <div className="mt-4 mb-1.5 text-[11.5px] text-muted">Adoption ceiling by adoption score</div>
      <div className="grid grid-cols-5 gap-2">
        {roi.adoptionCeilings.map((c, i) => (
          <NumField key={i} label={`Score ${i + 1}`} unit="%" value={Math.round(c * 100)} onChange={(v) => setCeiling(i, num(v, 100))} />
        ))}
      </div>
      <div className="mt-4 mb-1.5 text-[11.5px] text-muted">Monthly run cost</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <NumField label="Automation" unit="$/mo" value={roi.runCost.automation} onChange={(v) => setRun("automation", num(v))} />
        <NumField label="Skill" unit="$/person" value={roi.runCost.skill} onChange={(v) => setRun("skill", num(v))} />
        <NumField label="Agent" unit="$/mo" value={roi.runCost.agent} onChange={(v) => setRun("agent", num(v))} />
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">Capture rates per solution type are edited in Opportunities. Changes here also update the roadmap.</p>
    </div>
  );
}

function NumField({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (raw: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 tabular-nums" />
        <span className="text-[11px] whitespace-nowrap text-faint">{unit}</span>
      </span>
    </label>
  );
}

function HowWeForecast({ roi }: { roi: RoiAssumptions }) {
  const steps: ReactNode[] = [
    <>
      <b>Reported hours</b> H: hours per week each interviewee spends on the process × 4.33.
    </>,
    <>
      <b>Extrapolate to the team</b>: H × (team headcount ÷ people interviewed in that team), capped at {MAX_EXTRAPOLATION}×. Without a roster, the forecast uses interviewed employees only.
    </>,
    <>
      <b>Capture</b> by solution type: automation {pct(roi.capture.automation)}, agent {pct(roi.capture.agent)}, skill {pct(roi.capture.skill)}, kept human 0%.
    </>,
    <>
      <b>Adoption ceiling</b> from the adoption score 1–5: {roi.adoptionCeilings.map(pct).join(" / ")}, ramping {RAMP.map(pct).join(" → ")} over the first three months.
    </>,
    <>
      <b>Hours of capacity</b> per month = H_team × capture × adoption, valued at ${roi.hourlyCost}/h loaded cost.
    </>,
    <>
      <b>Build cost</b> = build hours ({BUILD_HOURS.join(" / ")} by effort score) × ${roi.builderRate}/h. <b>Run cost</b>: automation ${roi.runCost.automation}, skill ${roi.runCost.skill} per person covered, agent $
      {roi.runCost.agent} a month.
    </>,
    <>
      <b>12-month net</b> = ramped value − build − 12 × run. <b>ROI</b> = net ÷ cost. <b>Payback</b> is the first month cumulative value covers cumulative cost.
    </>,
    <>
      <b>Range</b>: low uses 60% of capture and 75% of adoption; high uses 115% and 110%, capped at 95%.
    </>,
    <>
      <b>Evidence</b>: strong with 3+ people and Jev confidence ≥ 80%; medium with 2+ people or confidence ≥ 60%; weak otherwise.
    </>,
  ];
  return (
    <Card className="p-5">
      <div className="mb-3 text-[14px] font-semibold tracking-tight">How we forecast</div>
      <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-2 marker:text-faint">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        All math is deterministic, with no AI model in the numbers. Hours freed are capacity, not cash: the value shows what that time is worth at loaded cost.
      </p>
    </Card>
  );
}
