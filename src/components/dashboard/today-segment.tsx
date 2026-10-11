"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown, Rocket } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge, Card, Empty, SectionTitle, SolutionBadge, Stat } from "@/components/ui";
import { money } from "@/lib/engine/opportunities";
import { decisionRules, type InitiativeTracking, type PortfolioSummary } from "@/lib/engine/roi";
import { FOLLOWUP_LABEL } from "@/lib/seed-followup";
import { DecisionBadge, decisionMeta, hours, KindLabel, pct, signedMoney, signedPct, type Kind } from "./labels";

export function TodaySegment({
  tracked,
  summary,
  byTeam,
  hourlyCost,
  simulated,
  helperRuns,
}: {
  tracked: InitiativeTracking[];
  summary: PortfolioSummary;
  byTeam: { team: string; value: number }[];
  hourlyCost: number;
  simulated: boolean;
  helperRuns: number;
}) {
  return (
    <section id="today" className="mb-14 scroll-mt-6">
      <SegmentHeading
        eyebrow="Segment A · Tracking"
        title="Today: what AI is returning"
        badge={simulated ? <Badge tone="warn">{FOLLOWUP_LABEL}</Badge> : null}
      >
        Initiatives already in pilot or production, judged against what we predicted before they were built.
      </SegmentHeading>

      {tracked.length === 0 ? (
        <Empty
          icon={<Rocket className="size-5" />}
          title="Nothing live yet"
          action={
            <Link href="/my-work" className="pressable inline-flex h-9 items-center rounded-lg bg-surface px-3.5 text-[13.5px] font-medium shadow-card hover:bg-[#fbfaf7]">
              Open My work
            </Link>
          }
        >
          When an initiative ships, its follow-up reports appear here. Feedback on My work helpers shows up as soon as an employee reviews a run.
        </Empty>
      ) : (
        <>
          <Card className="mb-6 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Invested to date" value={money(summary.invested)} sub={<Sub kind="reported">build + run cost</Sub>} />
            <Stat label="Value of capacity reported" value={money(summary.valueReported)} sub={<Sub kind="reported">at ${hourlyCost}/h loaded cost</Sub>} tone="accent" />
            <Stat label="Net return" value={signedMoney(summary.net)} sub={<Sub kind="reported">value − invested</Sub>} />
            <Stat
              label="Payback"
              value={summary.paidBack ? "Paid back" : summary.recovered === null ? "—" : `${pct(summary.recovered)}`}
              sub={<Sub kind="reported">{summary.paidBack ? "value covers spend" : "of spend recovered"}</Sub>}
            />
            <Stat
              label="Initiatives live"
              value={summary.initiativesLive}
              sub={
                <Sub kind="reported">
                  {summary.decisions.scale} scale · {summary.decisions.fix} fix · {summary.decisions.stop} stop
                </Sub>
              }
            />
          </Card>

          <p className="mb-6 text-[12.5px] text-muted">
            This month: <span className="font-medium text-ink tabular-nums">{hours(summary.reportedHoursPerMonth)}</span> hours of capacity <KindLabel kind="reported" /> against{" "}
            <span className="font-medium text-ink tabular-nums">{hours(summary.predictedHoursPerMonth)}</span> <KindLabel kind="predicted" /> for the same initiatives. Hours freed are
            capacity, not cash.
          </p>

          <div id="working" className="scroll-mt-6">
            <SectionTitle title="Where it is working" meta={`${tracked.length} initiatives`} />
            <InitiativeTable tracked={tracked} helperRuns={helperRuns} />
            <DecisionLegend />
          </div>

          <div className="mt-8">
            <SectionTitle title="Value by team" meta={<KindLabel kind="reported" />} />
            <ValueByTeam rows={byTeam} />
          </div>
        </>
      )}
    </section>
  );
}

export function SegmentHeading({ eyebrow, title, badge, children }: { eyebrow: string; title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-6 border-b border-line pb-4">
      <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">{eyebrow}</div>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-[22px] leading-tight text-ink">{title}</h2>
        {badge}
      </div>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export function Sub({ kind, children }: { kind: Kind; children: ReactNode }) {
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5">
      <KindLabel kind={kind} />
      <span>{children}</span>
    </span>
  );
}

type SortKey = "name" | "adoption" | "useful" | "reported" | "variance" | "invested" | "value" | "decision";

const sortValue: Record<SortKey, (t: InitiativeTracking) => number | string> = {
  name: (t) => t.name,
  adoption: (t) => t.adoption,
  useful: (t) => t.usefulRate,
  reported: (t) => t.reportedHours,
  variance: (t) => t.variancePct ?? -Infinity,
  invested: (t) => t.invested,
  value: (t) => t.valueReported,
  decision: (t) => decisionMeta[t.decision].order,
};

const columns: { key: SortKey; label: string; kind?: Kind; align?: "right" }[] = [
  { key: "name", label: "Initiative" },
  { key: "adoption", label: "Adoption", kind: "reported", align: "right" },
  { key: "useful", label: "Useful runs", kind: "reported", align: "right" },
  { key: "reported", label: "Hours/mo", align: "right" },
  { key: "variance", label: "Variance", align: "right" },
  { key: "invested", label: "Invested", kind: "reported", align: "right" },
  { key: "value", label: "Value reported", kind: "reported", align: "right" },
  { key: "decision", label: "Decision" },
];

function InitiativeTable({ tracked, helperRuns }: { tracked: InitiativeTracking[]; helperRuns: number }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "decision", dir: 1 });
  const rows = [...tracked].sort((a, b) => {
    const x = sortValue[sort.key](a);
    const y = sortValue[sort.key](b);
    return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
  });
  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "decision" ? 1 : -1 }));

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-muted">
            {columns.map((c) => {
              const active = sort.key === c.key;
              const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
              return (
                <th key={c.key} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={clsx("px-4 py-2.5 font-medium", c.align === "right" && "text-right")}>
                  <button type="button" onClick={() => toggle(c.key)} className={clsx("pressable inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}>
                    {c.label}
                    <Icon className="size-3 opacity-60" />
                  </button>
                  {c.kind && (
                    <div className={clsx(c.align === "right" && "flex justify-end")}>
                      <KindLabel kind={c.kind} />
                    </div>
                  )}
                  {c.key === "reported" && (
                    <div className="flex justify-end gap-1.5">
                      <KindLabel kind="reported" /> <span className="text-faint">vs</span> <KindLabel kind="predicted" />
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-line align-top last:border-0">
              <td className="min-w-[240px] px-4 py-3">
                <div className="font-semibold tracking-tight text-ink">{t.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                  <SolutionBadge solution={t.solution} />
                  <span className="capitalize">{t.status}</span>
                  <span>·</span>
                  <span>{t.teams.join(", ") || "No team yet"}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-faint">
                  <span>
                    {t.daysLive} days live · {t.totalReports} reports
                  </span>
                  {t.opportunityId.startsWith("helper:") && (
                    <>
                      <span>·</span>
                      <span>{helperRuns} runs logged</span>
                      <KindLabel kind="measured" />
                    </>
                  )}
                </div>
              </td>
              <Num>{pct(t.adoption)}</Num>
              <Num>{t.totalReports ? pct(t.usefulRate) : "—"}</Num>
              <Num>
                <span className="font-medium text-ink">{hours(t.reportedHours)}</span>
                <span className="text-faint"> / {t.predictedHours === null ? "—" : hours(t.predictedHours)}</span>
              </Num>
              <Num>
                <span className={clsx(t.variancePct !== null && (t.variancePct >= 0 ? "text-good" : "text-bad"))}>{t.variancePct === null ? "—" : signedPct(t.variancePct)}</span>
              </Num>
              <Num>{money(t.invested)}</Num>
              <Num>{money(t.valueReported)}</Num>
              <td className="px-4 py-3">
                <DecisionBadge decision={t.decision} reason={t.reason} />
                <div className="mt-1 max-w-[180px] text-[11.5px] leading-snug text-muted">{t.reason}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-right whitespace-nowrap text-ink-2 tabular-nums">{children}</td>;
}

function DecisionLegend() {
  return (
    <div className="mt-3 rounded-xl bg-sunken/70 p-4">
      <div className="mb-2 text-[12.5px] font-medium text-ink-2">How decisions are made · applied in this order, first match wins</div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {decisionRules.map((r) => (
          <li key={r.decision} className="text-[12px] leading-relaxed text-muted">
            <DecisionBadge decision={r.decision} />
            <div className="mt-1">{r.rule}</div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-faint">Variance compares reported hours with the forecast at the same month of the adoption ramp.</p>
    </div>
  );
}

function ValueByTeam({ rows }: { rows: { team: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.team} className="group grid grid-cols-[140px_1fr_64px] items-center gap-3 text-[12.5px]" title={`${r.team}: ${money(r.value)} reported value to date`}>
            <span className="truncate text-ink-2">{r.team}</span>
            <span className="h-3 rounded-r bg-sunken/60">
              <span className="block h-full rounded-r bg-accent transition-opacity group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium text-ink tabular-nums">{money(r.value)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
        Reports aren&apos;t broken down by team, so each initiative&apos;s reported value is split across its teams by their share of the predicted hours.
      </p>
    </Card>
  );
}
