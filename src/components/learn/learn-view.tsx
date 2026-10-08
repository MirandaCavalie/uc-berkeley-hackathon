"use client";

import clsx from "clsx";
import { ArrowRight, ChevronRight, Radar, RotateCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, ModeBadge, PageHeader, SectionTitle } from "@/components/ui";
import { stageBaseline } from "@/lib/baseline";
import { workflowCases, type WorkflowCase } from "@/lib/cases";
import { extractEvents, reconstructPath, type EventAction, type LearnedPath, type WorkEvent } from "@/lib/engine/events";
import type { WorkMode } from "@/lib/schemas";
import { stepKey } from "@/lib/scoring";
import { useStore } from "@/lib/store";

const actionLabel: Record<EventAction, string> = {
  brief: "Brief",
  stage: "Stage",
  comment: "Comment",
  "change-request": "Change request",
  request: "Request",
  result: "Result",
};

const modeBar: Record<WorkMode, string> = { automate: "bg-automate", assist: "bg-assist", human: "bg-human" };

export function LearnView() {
  const evidence = useStore((s) => s.evidence);
  const radar = useStore((s) => s.radar);
  const stepReviews = useStore((s) => s.stepReviews);

  const events = useMemo(() => extractEvents(evidence), [evidence]);
  const path = useMemo(() => reconstructPath(events), [events]);
  const baseline = stageBaseline(evidence, /consolidat/i);
  const confirmed = radar ? radar.result.steps.filter((s) => stepReviews[stepKey(s)]).length : 0;
  const timelineStages = path.stages.filter((s) => s.onTimeline);

  const pipeline = [
    { name: "Connect", value: `${path.sources} sources`, detail: [...new Set(evidence.map((e) => e.source))].join(", ") || "No evidence yet" },
    { name: "Extract", value: `${events.length} events`, detail: "Who, what, when, which stage" },
    {
      name: "Reconstruct",
      value: `${timelineStages.length} stages`,
      detail: path.loop ? `${path.loop.stages.length}-step loop, repeated ${path.loop.repeats}×` : "No loops found",
    },
    {
      name: "Confirm",
      value: radar ? `${confirmed}/${radar.result.steps.length} steps` : "Pending",
      detail: radar ? "Team corrections become rules" : "Run Radar to review steps",
      href: "/radar",
    },
    { name: "Measure", value: baseline ? `${baseline.days}-day baseline` : "No baseline", detail: "Same events measure the pilot" },
  ];

  return (
    <div>
      <PageHeader
        title="Workflow Learning"
        actions={
          <Link href="/radar" className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13.5px] font-medium text-white hover:bg-[#3029c4]">
            <Radar className="size-4" /> Open Radar
          </Link>
        }
      />

      <section className="mb-10">
        <SectionTitle title="How it learns" />
        <ol className="grid gap-2 md:grid-cols-5">
          {pipeline.map((p, i) => {
            const body = (
              <>
                <div className="flex items-center justify-between text-[11.5px] text-faint">
                  <span className="tabular-nums">{i + 1}</span>
                  {i < pipeline.length - 1 && <ChevronRight className="hidden size-3.5 md:block" />}
                </div>
                <div className="mt-1 text-[13.5px] font-semibold">{p.name}</div>
                <div className="mt-2 text-[18px] font-semibold tracking-tight tabular-nums">{p.value}</div>
                <div className="mt-0.5 line-clamp-2 text-[12px] text-muted">{p.detail}</div>
              </>
            );
            return (
              <li key={p.name} style={{ "--i": i } as React.CSSProperties} className="enter">
                {p.href ? (
                  <Link href={p.href} className="lift pressable block h-full rounded-xl bg-surface p-4 shadow-card">
                    {body}
                  </Link>
                ) : (
                  <div className="h-full rounded-xl bg-surface p-4 shadow-card">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-12 grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <EventLog events={events} />
        <PathCard path={path} events={events} />
      </section>

      <Cases />
    </div>
  );
}

function EventLog({ events }: { events: WorkEvent[] }) {
  const sources = [...new Set(events.map((e) => e.source))];
  const [source, setSource] = useState<string | null>(null);
  const shown = source ? events.filter((e) => e.source === source) : events;

  return (
    <div>
      <SectionTitle title="Event log" meta={shown.length} />
      <div className="mb-2 flex flex-wrap gap-1">
        {[null, ...sources].map((s) => (
          <button
            key={s ?? "all"}
            type="button"
            onClick={() => setSource(s)}
            className={clsx("pressable rounded-md px-2 py-1 text-[12px]", source === s ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line-strong/50")}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>
      <Card className="max-h-[560px] divide-y divide-line overflow-y-auto scrollbar-thin">
        {shown.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-faint">No events</div>}
        {shown.map((e) => (
          <div key={e.id} className="grid grid-cols-[92px_1fr] gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[11.5px] text-muted">{e.source}</div>
              <div className="truncate font-mono text-[11px] text-faint">{e.when || "—"}</div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] font-medium">{e.actor}</span>
                {e.role && <span className="text-[11.5px] text-faint">{e.role}</span>}
                <span className="rounded bg-sunken px-1.5 text-[10.5px] text-muted">{actionLabel[e.action]}</span>
                <ArrowRight className="size-3 text-faint" />
                <span className="text-[11.5px] font-medium text-accent">{e.stage}</span>
                {e.round && <span className="text-[11px] text-faint">round {e.round}</span>}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-2">{e.detail}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PathCard({ path, events }: { path: LearnedPath; events: WorkEvent[] }) {
  const timeline = path.stages.filter((s) => s.onTimeline);
  const offTimeline = path.stages.filter((s) => !s.onTimeline);
  const hours = (stage: string) => events.filter((e) => e.stage === stage).reduce((n, e) => n + (e.hours ?? 0), 0);
  const manual = [...new Set(path.stages.flatMap((s) => s.manual))];

  return (
    <div>
      <SectionTitle title="Learned path" />
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-3 border-b border-line pb-4">
          <Metric label="End to end" value={path.totalDays ? `${path.totalDays} d` : "—"} />
          <Metric label="Handoffs" value={path.handoffs} />
          <Metric label="People" value={path.people} />
        </div>

        {timeline.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-faint">Add an approval timeline to reconstruct the path</div>
        ) : (
          <ol className="mt-3 space-y-0.5">
            {timeline.map((s, i) => {
              const looped = path.loop?.stages.includes(s.stage);
              return (
                <li key={s.stage} className={clsx("flex items-center gap-3 rounded-lg px-2 py-1.5", looped && "bg-assist-soft/60")}>
                  <span className="w-4 text-right text-[11px] text-faint tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{s.stage}</div>
                    <div className="truncate text-[11.5px] text-muted">
                      {s.owner} · {s.days} d{s.events > s.occurrences ? ` · ${s.events} events` : ""}
                    </div>
                  </div>
                  {s.manual.length > 0 && <Badge tone="bad">manual</Badge>}
                  {looped && (
                    <Badge tone="warn">
                      <RotateCw className="size-3" />×{s.occurrences}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {offTimeline.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 text-[12px] font-medium text-ink-2">Off the timeline</div>
            <div className="flex flex-wrap gap-1.5">
              {offTimeline.map((s) => (
                <span key={s.stage} className="rounded-md bg-sunken px-2 py-1 text-[12px] text-ink-2">
                  {s.stage}
                  <span className="ml-1 text-faint tabular-nums">{hours(s.stage) ? `${hours(s.stage)} h` : `${s.events}`}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {manual.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 text-[12px] font-medium text-ink-2">Manual work found</div>
            <ul className="space-y-1">
              {manual.slice(0, 5).map((m) => (
                <li key={m} className="text-[12.5px] leading-relaxed text-ink-2">
                  “{m}”
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-[20px] font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function Cases() {
  const evidence = useStore((s) => s.evidence);
  const [selected, setSelected] = useState(workflowCases[0].id);
  const found = useMemo(
    () => new Set(workflowCases.filter((c) => evidence.some((e) => c.detect.test(e.content))).map((c) => c.id)),
    [evidence],
  );
  const current = workflowCases.find((c) => c.id === selected) ?? workflowCases[0];

  return (
    <section>
      <SectionTitle title="Real cases" meta={workflowCases.length} />
      <div className="grid items-start gap-4 lg:grid-cols-[260px_1fr]">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {workflowCases.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={clsx(
                "pressable shrink-0 rounded-xl px-3 py-2.5 text-left transition-shadow duration-150 lg:w-full",
                selected === c.id ? "bg-surface shadow-[0_0_0_1.5px_var(--color-ink),var(--shadow-card)]" : "hover:bg-sunken",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium">{c.name}</span>
                {found.has(c.id) && <span className="size-1.5 shrink-0 rounded-full bg-good" title="Seen in your evidence" />}
              </div>
              <div className="mt-0.5 truncate text-[11.5px] text-muted">{c.context}</div>
            </button>
          ))}
        </div>
        <CaseDetail key={current.id} c={current} inEvidence={found.has(current.id)} />
      </div>
    </section>
  );
}

function CaseDetail({ c, inEvidence }: { c: WorkflowCase; inEvidence: boolean }) {
  return (
    <Card className="enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">{c.name}</h3>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {c.trigger} <ArrowRight className="inline size-3" /> {c.output}
          </div>
        </div>
        {inEvidence && <Badge tone="good">Seen in your evidence</Badge>}
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-2 scrollbar-thin">
        <ol className="flex min-w-max items-center">
          {c.steps.map((s, i) => (
            <li key={s.name} className="flex items-center">
              <div className="relative w-[132px] overflow-hidden rounded-lg bg-sunken/60 p-2.5 pt-3">
                <span className={clsx("absolute inset-x-0 top-0 h-1", modeBar[s.mode])} />
                <div className="flex items-center justify-between text-[10.5px] text-faint">
                  <span className="tabular-nums">{i + 1}</span>
                  {s.loop && <RotateCw className="size-3 text-assist" aria-label="Repeats" />}
                </div>
                <div className="mt-0.5 line-clamp-2 min-h-[34px] text-[12.5px] leading-snug font-medium">{s.name}</div>
              </div>
              {i < c.steps.length - 1 && <ChevronRight className="mx-0.5 size-3.5 shrink-0 text-faint" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-[11.5px] text-muted">
              <th className="py-2 pr-3 font-medium">Step</th>
              <th className="py-2 pr-3 font-medium">Owner</th>
              <th className="py-2 pr-3 font-medium">Mode</th>
              <th className="py-2 font-medium">Learned from</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {c.steps.map((s) => (
              <tr key={s.name} className="align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-[11.5px] text-faint">{s.tools}</div>
                </td>
                <td className="py-2 pr-3 text-ink-2">{s.owner}</td>
                <td className="py-2 pr-3">
                  <ModeBadge mode={s.mode} />
                </td>
                <td className="py-2 text-ink-2">{s.signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 border-t border-line pt-4 md:grid-cols-3">
        <List title="Where time leaks" items={c.leaks} />
        <List title="Stays human" items={c.human} />
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-ink-2">First pilot</div>
          <p className="text-[12.5px] leading-relaxed text-ink-2">{c.pilot}</p>
          <Link href={c.href} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline">
            {c.workflow === "review" ? "Review Loop" : c.workflow === "launch" ? "Campaign Launch" : c.href === "/brand" ? "Brand Kit" : "Radar"}
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
        {c.sources.map((s) => (
          <span key={s} className="rounded bg-sunken px-1.5 py-0.5">
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium text-ink-2">{title}</div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
            <span className="mt-[8px] size-1 shrink-0 rounded-full bg-faint" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
