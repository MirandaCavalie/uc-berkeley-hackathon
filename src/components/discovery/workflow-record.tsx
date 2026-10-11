"use client";

import { Card, Badge } from "@/components/ui";
import { dimensions, labels, type Fact, type WorkRecord, type Quality } from "@/lib/discovery/schema";
import { weeklyHours } from "@/lib/discovery/evidence";

function Evidence({ fact }: { fact: Fact | null }) {
  if (!fact) return <span className="text-muted">Not captured yet</span>;
  return <div><p className="whitespace-pre-wrap">{fact.value}</p><details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">Source {fact.citations.length > 1 ? "quotes" : "quote"}</summary>{fact.citations.map((c, i) => <blockquote className="mt-2 border-l-2 border-accent/30 pl-3" key={i}>“{c.quote}”</blockquote>)}</details></div>;
}
export function WorkflowRecord({ record, quality }: { record: WorkRecord; quality: Quality }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">What we learned</h2><Badge tone={quality.ready ? "good" : "warn"}>{quality.coverage}% captured</Badge></div>
    <p className="text-sm text-muted">These are reported facts, not verified operational measurements. Review the interpretations and time estimates before using them.</p>
    {quality.flags.length > 0 && <Card className="p-4"><h3 className="font-medium text-warn">Needs clarification</h3><ul className="mt-2 list-disc pl-5 text-sm">{quality.flags.map((f, i) => <li key={i}>{f}</li>)}</ul></Card>}
    <Card className="grid gap-5 p-5 sm:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">Role and context</h3><Evidence fact={record.context} /></div><div><h3 className="mb-2 text-sm font-semibold">AI use and restrictions</h3><Evidence fact={record.aiUse} /></div></Card>
    {record.workflows.map(w => <Card className="overflow-hidden" key={w.id}>
      <div className="border-b border-line p-5"><h3 className="text-lg font-semibold">{w.name.value}</h3><p className="mt-1 text-sm text-muted">{weeklyHours(w) === null ? "Weekly active time is not yet established." : `${weeklyHours(w)} hours/week of reported active work`}</p>{w.timing && <p className="mt-1 text-xs text-muted">{w.timing.minutesPerRun} minutes × {w.timing.runsPerPeriod} occurrences/{w.timing.period}{w.timing.period === "day" ? ` × ${w.timing.daysPerWeek ?? "unknown"} days/week` : w.timing.period === "month" ? " ÷ 4.33 weeks/month" : ""}. Waiting time is excluded.</p>}</div>
      <dl className="grid gap-5 p-5 sm:grid-cols-2">{dimensions.map(k => <div key={k}><dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{labels[k]}</dt><dd className="text-sm leading-6"><Evidence fact={w[k]} /></dd></div>)}</dl>
    </Card>)}
    {!!quality.missing.length && <details className="text-sm text-muted"><summary className="cursor-pointer">{quality.missing.length} unanswered areas</summary><ul className="mt-2 list-disc pl-5">{quality.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></details>}
  </div>;
}
