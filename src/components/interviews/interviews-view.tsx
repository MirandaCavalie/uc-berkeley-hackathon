"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, ClipboardList, Radar, Trash2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Confidence } from "@/components/shared";
import { Badge, Button, Card, Empty, Input, ModeBadge, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { judgeTasks } from "@/lib/client";
import { designerGuide, effectiveMode, INTERVIEW_EVIDENCE_ID, interviewsToEvidence, summarize, type Finding } from "@/lib/engine/interview";
import { loopBaseline } from "@/lib/engine/loop";
import type { WorkMode } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import type { Interview } from "@/lib/types";
import { InterviewRunner } from "./interview-runner";

const modeBar: Record<WorkMode, string> = { automate: "bg-automate", assist: "bg-assist", human: "bg-human" };

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`);

export function InterviewsView() {
  const interviews = useStore((s) => s.interviews);
  const roi = useStore((s) => s.roi);
  const evidence = useStore((s) => s.evidence);
  const saveInterview = useStore((s) => s.saveInterview);
  const upsertEvidence = useStore((s) => s.upsertEvidence);
  const log = useStore((s) => s.log);
  const [active, setActive] = useState<string | null>(null);
  const results = useMemo(() => summarize(interviews, roi), [interviews, roi]);
  const exported = interviewsToEvidence(interviews);
  const inRadar = evidence.find((e) => e.id === INTERVIEW_EVIDENCE_ID);
  const synced = Boolean(inRadar && exported && inRadar.content === exported.content);
  useJevBackfill(interviews, saveInterview);

  const running = interviews.find((i) => i.id === active);
  if (running) return <InterviewRunner key={running.id} interview={running} onClose={() => setActive(null)} />;

  function sendToRadar() {
    if (!exported) return;
    upsertEvidence(exported);
    log({ workflow: "radar", title: "Interviews added to Radar", detail: `${results.completed} interviews · ${results.taskCount} tasks` });
    toast.success("Added to Radar evidence", { description: "Re-run Radar to fold the interviews into the workflow map." });
  }

  return (
    <div>
      <PageHeader
        title="Team Interviews"
        actions={
          <>
            <Button
              icon={<ClipboardList className="size-4" />}
              onClick={() => {
                navigator.clipboard?.writeText(designerGuide());
                toast("Designer interview guide copied");
              }}
            >
              Copy designer guide
            </Button>
            {synced ? (
              <Link href="/radar" className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3.5 text-[13.5px] font-medium shadow-card hover:bg-[#fbfaf7]">
                In Radar <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <Button variant="accent" onClick={sendToRadar} disabled={!exported} icon={<Radar className="size-4" />}>
                {inRadar ? "Update Radar" : "Send to Radar"}
              </Button>
            )}
          </>
        }
      />

      {results.completed === 0 ? (
        <Empty icon={<Users className="size-5" />} title="No completed interviews yet">
          Invite the people who touch campaign work. Each one answers a short async AI interview; the results land here.
        </Empty>
      ) : (
        <>
          <section className="mb-10">
            <Card className="grid gap-x-6 gap-y-6 p-6 md:grid-cols-4">
              <Stat
                label="Interviews completed"
                value={`${results.completed}/${results.invited}`}
                sub={`${results.completionRate}% of invited${results.waveDays ? ` · ${results.waveDays} days` : ""}`}
              />
              <Stat label="Hours/month mapped" value={results.hoursPerMonth.toLocaleString()} sub={`across ${results.taskCount} tasks`} />
              <Stat label="Recoverable hours/month*" value={results.recoverableHours.toLocaleString()} tone="automate" sub="automate + assist" />
              <Stat label="Projected annual savings*" value={money(results.annualSavings)} tone="accent" sub={`at $${roi.hourlyCost}/h loaded cost`} />
              <Stat label="First-month ROI*" value={results.firstMonthRoi != null ? `${results.firstMonthRoi.toLocaleString()}%` : "—"} sub={`vs. ${money(roi.toolCostPerMonth)}/mo tooling`} />
              <Stat label="Discovery hours saved" value={results.discoveryHoursSaved} sub="vs. live interviews + notes" />
              <Stat label="Avg satisfaction" value={results.avgSatisfaction ?? "—"} sub="out of 5" />
              <Stat label="Would talk again" value={results.wouldTalkAgain != null ? `${results.wouldTalkAgain}%` : "—"} sub="rated 4 or 5" />
              <div className="md:col-span-4">
                <ModeSplit hours={results.hoursByMode} />
              </div>
            </Card>
          </section>

          <LoopFromInterviews />

          <section className="mb-10">
            <SectionTitle title="Findings" meta={results.findings.length} />
            <div className="space-y-2">
              {results.findings.map((f, i) => (
                <FindingRow key={f.stage} finding={f} rank={i + 1} hourlyCost={roi.hourlyCost} defaultOpen={i === 0} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mb-10">
        <People interviews={interviews} onOpen={setActive} />
      </section>

      <section>
        <Assumptions />
      </section>
    </div>
  );
}

function LoopFromInterviews() {
  const evidence = useStore((s) => s.evidence);
  const interviews = useStore((s) => s.interviews);
  const b = loopBaseline(evidence, interviews);
  if (!b.reporters.length && !b.quotes.length) return null;
  return (
    <section className="mb-10">
      <SectionTitle
        title="Feedback loop"
        meta={b.reporters.length ? `${b.reporters.length} creatives` : undefined}
        action={
          <Link href="/review" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
            Open Review Loop <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <Card className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-5">
          <Stat label="Rounds per asset" value={b.reportedRounds ?? "—"} sub="self-reported" />
          <Stat label="Hours per round" value={b.reportedHoursPerRound ?? "—"} sub="to one list of changes" />
          <Stat label="Consolidating" value={b.consolidationHoursPerMonth != null ? `${b.consolidationHoursPerMonth} h/mo` : "—"} />
          <Stat label="Waiting on feedback" value={b.waitingOnFeedback.length} sub={b.waitingOnFeedback.map((n) => n.split(" ")[0]).join(", ") || undefined} />
        </div>
        <div className="space-y-2">
          {b.quotes.slice(0, 3).map((q, i) => (
            <figure key={i} className="rounded-lg bg-sunken/60 px-3 py-2">
              <blockquote className="text-[13px] leading-relaxed text-ink-2">“{q.text}”</blockquote>
              <figcaption className="mt-0.5 text-[11.5px] text-muted">
                {q.person}, {q.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </Card>
    </section>
  );
}

function useJevBackfill(interviews: Interview[], save: (iv: Interview) => void) {
  const asked = useRef(false);
  useEffect(() => {
    const pending = interviews.filter((iv) => iv.status === "completed" && iv.tasks.some((t) => t.judgment === undefined));
    if (asked.current || !pending.length) return;
    asked.current = true;
    judgeTasks(pending).then((judged) => judged?.forEach(save));
  }, [interviews, save]);
}

function ModeSplit({ hours }: { hours: Record<WorkMode, number> }) {
  const total = hours.automate + hours.assist + hours.human || 1;
  const modes: [WorkMode, string][] = [
    ["automate", "Automate"],
    ["assist", "Assist"],
    ["human", "Human"],
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-sunken">
        {modes.map(([m]) => (
          <div key={m} className={clsx("reveal-bar h-full", modeBar[m])} style={{ width: `${(hours[m] / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
        {modes.map(([m, label]) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span className={clsx("size-1.5 rounded-full", modeBar[m])} />
            {label} <span className="text-ink-2 tabular-nums">{hours[m]} h/mo</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FindingRow({ finding: f, rank, hourlyCost, defaultOpen }: { finding: Finding; rank: number; hourlyCost: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="w-5 text-center text-[13px] font-medium text-faint tabular-nums">{rank}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{f.stage}</span>
            <ModeBadge mode={f.mode} />
            {f.waitMentions.length > 0 && (
              <Badge tone="warn">
                {f.waitMentions.length} {f.waitMentions.length === 1 ? "person waits" : "people wait"} on this
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {f.people.length} {f.people.length === 1 ? "person" : "people"} · {f.roles.join(", ")}
          </div>
        </div>
        <div className="hidden text-right md:block">
          <div className="text-[14px] font-semibold tabular-nums">{f.hoursPerMonth} h/mo</div>
          <div className="text-[12px] text-muted tabular-nums">
            {f.recoverableHours ? `${f.recoverableHours} h recoverable · ${money(f.recoverableHours * hourlyCost * 12)}/yr` : "Stays human"}
          </div>
        </div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="enter border-t border-line px-4 pt-3 pb-4 md:pl-[52px]">
          <div className="divide-y divide-line">
            {f.tasks.map((t) => (
              <div key={t.id} className="grid gap-x-4 gap-y-1 py-2 md:grid-cols-[150px_1fr_70px_auto]">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium">{t.person}</div>
                  <div className="truncate text-[11px] text-faint">{t.role}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-2">{t.name}</div>
                  {t.pain && <div className="mt-0.5 text-[12px] text-muted">“{t.pain}”</div>}
                </div>
                <div className="text-[12.5px] text-muted tabular-nums md:text-right">{t.hoursPerWeek} h/wk</div>
                <div className="flex items-center gap-1.5 md:justify-end">
                  {effectiveMode(t) !== f.mode && <ModeBadge mode={effectiveMode(t)} />}
                  {t.judgment && <Confidence judgment={t.judgment} />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted">
            {f.tools.length > 0 && <span>Tools: {f.tools.join(", ")}</span>}
            {f.waitMentions.length > 0 && <span className="text-warn">Others wait on this: {f.waitMentions.join(", ")}</span>}
          </div>
          {f.keepHuman.map((k) => (
            <div key={k.person} className="mt-2 rounded-lg bg-human-soft/60 px-3 py-2 text-[12.5px] text-ink-2">
              <span className="font-medium text-human">{k.person}:</span> “{k.text}”
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const statusTone = { invited: "neutral", "in-progress": "warn", completed: "good" } as const;
const statusLabel = { invited: "Invited", "in-progress": "In progress", completed: "Completed" } as const;

function People({ interviews, onOpen }: { interviews: Interview[]; onOpen: (id: string) => void }) {
  const invite = useStore((s) => s.inviteInterview);
  const remove = useStore((s) => s.removeInterview);
  const [form, setForm] = useState({ name: "", role: "", team: "" });
  const [adding, setAdding] = useState(false);

  function add() {
    if (!form.name.trim() || !form.role.trim()) return;
    invite({ name: form.name.trim(), role: form.role.trim(), team: form.team.trim() || "Marketing" });
    toast.success(`${form.name.trim()} invited`);
    setForm({ name: "", role: "", team: "" });
  }

  return (
    <>
      <SectionTitle
        title="People"
        meta={interviews.length}
        action={
          <Button size="sm" onClick={() => setAdding((a) => !a)} icon={<UserPlus className="size-3.5" />}>
            Invite
          </Button>
        }
      />
      {adding && (
        <Card className="enter mb-2 flex flex-wrap items-center gap-2 p-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="max-w-[200px]" aria-label="Name" />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="max-w-[200px]" aria-label="Role" />
          <Input
            placeholder="Team"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="max-w-[160px]"
            aria-label="Team"
          />
          <Button variant="primary" onClick={add} disabled={!form.name.trim() || !form.role.trim()}>
            Add
          </Button>
        </Card>
      )}
      <Card className="divide-y divide-line">
        {interviews.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-faint">Nobody invited yet</div>}
        {interviews.map((iv) => {
          const hours = iv.tasks.reduce((n, t) => n + t.hoursPerWeek, 0);
          return (
            <div key={iv.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[1.2fr_1fr_110px_110px_auto]">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{iv.name}</div>
                <div className="truncate text-[12px] text-muted">
                  {iv.role} · {iv.team}
                </div>
              </div>
              <div className="hidden text-[12.5px] text-muted md:block">
                {iv.status === "completed" ? `${iv.tasks.length} tasks · ${Math.round(hours * 10) / 10} h/wk` : iv.status === "in-progress" ? "Partly answered" : "Not started"}
              </div>
              <div className="hidden md:block">
                <Badge tone={statusTone[iv.status]}>{statusLabel[iv.status]}</Badge>
              </div>
              <div className="hidden text-[12px] text-faint md:block">{iv.satisfaction ? `${iv.satisfaction}/5` : ""}</div>
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant={iv.status === "completed" ? "ghost" : "primary"} onClick={() => onOpen(iv.id)}>
                  {iv.status === "completed" ? "View" : iv.status === "in-progress" ? "Continue" : "Start interview"}
                </Button>
                <button
                  type="button"
                  onClick={() => remove(iv.id)}
                  aria-label={`Remove ${iv.name}`}
                  className="pressable grid size-7 place-items-center rounded-md text-faint hover:bg-sunken hover:text-bad"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}

function Assumptions() {
  const roi = useStore((s) => s.roi);
  const setRoi = useStore((s) => s.setRoi);
  const pct = (m: WorkMode) => Math.round(roi.capture[m] * 100);
  const setCapture = (m: WorkMode, v: number) => setRoi({ capture: { ...roi.capture, [m]: Math.min(100, Math.max(0, v)) / 100 } });
  const fields: { label: string; value: number; onChange: (v: number) => void; unit: string }[] = [
    { label: "Loaded hourly cost", value: roi.hourlyCost, onChange: (v) => setRoi({ hourlyCost: v }), unit: "$/h" },
    { label: "Automate captures", value: pct("automate"), onChange: (v) => setCapture("automate", v), unit: "%" },
    { label: "Assist captures", value: pct("assist"), onChange: (v) => setCapture("assist", v), unit: "%" },
    { label: "Tooling cost", value: roi.toolCostPerMonth, onChange: (v) => setRoi({ toolCostPerMonth: v }), unit: "$/mo" },
    { label: "Manual discovery per person", value: roi.manualHoursPerInterview, onChange: (v) => setRoi({ manualHoursPerInterview: v }), unit: "h" },
  ];
  return (
    <div className="rounded-xl bg-sunken/70 p-4">
      <div className="mb-3 text-[12.5px] font-medium text-ink-2">Assumptions</div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        *Projected from self-reported hours per week × 4.33. Human work counts as zero recoverable time. Validate with time tracking during the pilot.
      </p>
    </div>
  );
}