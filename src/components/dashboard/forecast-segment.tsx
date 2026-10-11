"use client";

import clsx from "clsx";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { Button, Card, Input, SectionTitle, SolutionBadge } from "@/components/ui";
import { defaultRoi, money } from "@/lib/engine/opportunities";
import { BUILD_HOURS, MAX_EXTRAPOLATION, paybackLabel, RAMP, type AreaForecast, type OpportunityForecast } from "@/lib/engine/roi";
import { useStore } from "@/lib/store";
import type { Opportunity, RoiAssumptions, Solution } from "@/lib/types";
import { EvidenceMeter, hours, pct, signedMoney } from "./labels";

export function ForecastSegment({ areas, next, roi }: { areas: AreaForecast[]; next: { o: Opportunity; f: OpportunityForecast }[]; roi: RoiAssumptions }) {
  return (
    <section id="forecast" className="scroll-mt-6 border-t border-line pt-10">
      <div id="next" className="mb-10 scroll-mt-6">
        <div className="mb-5">
          <h2 className="font-display text-[22px] leading-tight text-ink">Next investments</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-muted">The three opportunities with the highest estimated 12-month net value after implementation and operating costs.</p>
        </div>
        {next.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {next.map(({ o, f }) => <InvestCard key={o.id} opportunity={o} forecast={f} />)}
          </div>
        ) : (
          <Card className="p-5 text-[13px] text-muted">Every roadmap opportunity is already live. Run another discovery cycle to identify the next investments.</Card>
        )}
      </div>

      <div className="mb-8">
        <SectionTitle title="Forecast by team" meta="Expand a team to see its processes" />
        <AreaTable areas={areas} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AssumptionsPanel />
        <HowWeForecast roi={roi} />
      </div>
    </section>
  );
}

function InvestCard({ opportunity, forecast }: { opportunity: Opportunity; forecast: OpportunityForecast }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{opportunity.process}</h3>
          <p className="mt-0.5 text-[12px] text-muted">{opportunity.teams.join(", ")}</p>
        </div>
        <SolutionBadge solution={opportunity.solution} />
      </div>

      <div className="mt-5">
        <div className="text-[11.5px] text-muted">12-month net value</div>
        <div className="mt-0.5 text-[28px] font-semibold tracking-tight text-accent tabular-nums">{signedMoney(forecast.base.net12)}</div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
        <div>
          <dt className="text-[11px] text-muted">Time saved / month</dt>
          <dd className="mt-1 text-[16px] font-semibold tabular-nums">{hours(forecast.base.monthlyHours)} h</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Payback</dt>
          <dd className="mt-1 text-[16px] font-semibold tabular-nums">{paybackLabel(forecast.base.paybackMonth)} months</dd>
        </div>
      </dl>

      <details className="group mt-4 border-t border-line pt-3">
        <summary className="pressable flex cursor-pointer list-none items-center justify-between text-[12px] font-medium text-accent">
          View estimate
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-3 space-y-2 text-[11.5px] leading-5 text-muted">
          <DetailRow label="First-year cost" value={money(forecast.base.cost12)} />
          <DetailRow label="Monthly value" value={money(forecast.base.monthlyValue)} />
          <DetailRow label="Expected range" value={`${signedMoney(forecast.low.net12)} to ${signedMoney(forecast.high.net12)}`} />
          <DetailRow label="Evidence" value={`${forecast.evidence.people} ${forecast.evidence.people === 1 ? "employee" : "employees"} · ${forecast.evidence.strength}`} />
        </dl>
        <p className="mt-3 text-[11.5px] leading-5 text-muted">{basisText(forecast)}</p>
      </details>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><dt>{label}</dt><dd className="text-right font-medium text-ink-2 tabular-nums">{value}</dd></div>;
}

function basisText(forecast: OpportunityForecast) {
  if (forecast.basis === "sample") return "Based on completed interviews. Add a team roster to estimate company-wide impact.";
  return `Estimated from ${forecast.interviewed} interviewed employees across a team of ${forecast.headcount.toLocaleString()}${forecast.capped ? `, with growth capped at ${MAX_EXTRAPOLATION}×` : ""}.`;
}

function AreaTable({ areas }: { areas: AreaForecast[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(areas.slice(0, 1).map((area) => area.team)));
  const toggle = (team: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(team)) next.delete(team);
    else next.add(team);
    return next;
  });

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b border-line bg-paper/55 text-left text-[11.5px] font-semibold text-muted">
            <th className="px-4 py-3">Team / process</th>
            <Th>Time saved / month</Th>
            <Th>Value / month</Th>
            <Th>12-month net</Th>
            <Th>Payback</Th>
            <th className="px-4 py-3">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <Fragment key={area.team}>
              <tr className="border-b border-line bg-paper/40 font-medium text-ink">
                <td className="px-4 py-3">
                  <button type="button" aria-expanded={open.has(area.team)} onClick={() => toggle(area.team)} className="pressable inline-flex items-center gap-1.5 hover:text-accent">
                    <ChevronRight className={clsx("size-3.5 text-muted transition-transform", open.has(area.team) && "rotate-90")} />
                    {area.team}
                  </button>
                </td>
                <Num>{hours(area.base.monthlyHours)} h</Num>
                <Num>{money(area.base.monthlyValue)}</Num>
                <Num>{signedMoney(area.base.net12)}</Num>
                <Num>{paybackLabel(area.base.paybackMonth)} mo</Num>
                <td className="px-4 py-3 text-[12px] font-normal text-muted">{area.processes.length} {area.processes.length === 1 ? "process" : "processes"}</td>
              </tr>
              {open.has(area.team) && area.processes.map((process) => (
                <tr key={area.team + process.opportunityId} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 pl-9">
                    <div className="flex items-center gap-2 text-ink">
                      <span>{process.process}</span>
                      <SolutionBadge solution={process.solution} />
                    </div>
                  </td>
                  <Num>{hours(process.base.monthlyHours)} h</Num>
                  <Num>{money(process.base.monthlyValue)}</Num>
                  <Num>{signedMoney(process.base.net12)}</Num>
                  <Num>{paybackLabel(process.base.paybackMonth)} mo</Num>
                  <td className="px-4 py-3"><EvidenceMeter {...process.evidence} /></td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-right">{children}</th>;
}

function Num({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-right whitespace-nowrap text-ink-2 tabular-nums">{children}</td>;
}

function AssumptionsPanel() {
  const roi = useStore((state) => state.roi);
  const setRoi = useStore((state) => state.setRoi);
  const num = (raw: string, max = Infinity) => {
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
  };
  const setCeiling = (index: number, value: number) => {
    const next = [...roi.adoptionCeilings] as RoiAssumptions["adoptionCeilings"];
    next[index] = value / 100;
    setRoi({ adoptionCeilings: next });
  };
  const setRun = (solution: Solution, value: number) => setRoi({ runCost: { ...roi.runCost, [solution]: value } });
  const reset = () => setRoi({ hourlyCost: defaultRoi.hourlyCost, builderRate: defaultRoi.builderRate, adoptionCeilings: defaultRoi.adoptionCeilings, runCost: defaultRoi.runCost });

  return (
    <details className="group rounded-xl bg-surface p-5 shadow-card">
      <summary className="pressable flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold">
        Adjust forecast assumptions
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={reset}>Defaults</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Loaded hourly cost" unit="$/h" value={roi.hourlyCost} onChange={(value) => setRoi({ hourlyCost: num(value) })} />
          <NumField label="Builder rate" unit="$/h" value={roi.builderRate} onChange={(value) => setRoi({ builderRate: num(value) })} />
        </div>
        <div className="mt-4 mb-1.5 text-[11.5px] text-muted">Adoption ceiling by readiness score</div>
        <div className="grid grid-cols-5 gap-2">
          {roi.adoptionCeilings.map((ceiling, index) => <NumField key={index} label={`${index + 1}`} unit="%" value={Math.round(ceiling * 100)} onChange={(value) => setCeiling(index, num(value, 100))} />)}
        </div>
        <div className="mt-4 mb-1.5 text-[11.5px] text-muted">Monthly operating cost</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <NumField label="Automation" unit="$/mo" value={roi.runCost.automation} onChange={(value) => setRun("automation", num(value))} />
          <NumField label="Skill" unit="$/person" value={roi.runCost.skill} onChange={(value) => setRun("skill", num(value))} />
          <NumField label="Agent" unit="$/mo" value={roi.runCost.agent} onChange={(value) => setRun("agent", num(value))} />
        </div>
      </div>
    </details>
  );
}

function NumField({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (raw: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 tabular-nums" />
        <span className="text-[11px] whitespace-nowrap text-faint">{unit}</span>
      </span>
    </label>
  );
}

function HowWeForecast({ roi }: { roi: RoiAssumptions }) {
  const steps = [
    "Use interview evidence to estimate how much time each process consumes.",
    `Extend that estimate to the team roster, capped at ${MAX_EXTRAPOLATION}× to avoid overstating thin evidence.`,
    `Apply expected task capture and adoption over the first three months (${RAMP.map(pct).join(" → ")}).`,
    `Value the time at $${roi.hourlyCost}/hour, then subtract implementation and 12 months of operating costs.`,
  ];
  return (
    <details className="group rounded-xl bg-surface p-5 shadow-card">
      <summary className="pressable flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold">
        How the forecast works
        <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5 border-t border-line pt-4">
        <ol className="list-decimal space-y-2 pl-5 text-[12.5px] leading-5 text-ink-2 marker:text-faint">
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p className="mt-4 text-[11.5px] leading-5 text-muted">Implementation effort uses {BUILD_HOURS.join(" / ")} hours across effort scores 1–5. The range on each investment changes capture and adoption assumptions; the displayed headline uses the base case.</p>
      </div>
    </details>
  );
}
