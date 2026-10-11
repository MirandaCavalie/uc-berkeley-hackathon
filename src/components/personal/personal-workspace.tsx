"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Copy, Gauge, Network, Printer, ShieldCheck, Sparkles, Target, Wrench } from "lucide-react";
import { toast } from "sonner";
import { initialConfig, progressFor } from "@/lib/personal/meeting";
import { buildEmployeeProfile, employeeReportMarkdown, type EmployeeProfile, type PersonalOpportunity } from "@/lib/personal/profile";
import type { HelperDraft, HelperRun, PersonalHelper } from "@/lib/personal/types";
import { useHydrated, useStore } from "@/lib/store";
import type { Interview, Workspace } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, SolutionBadge, Stat } from "../ui";
import { MeetingBuilder } from "./meeting-builder";

export const selectStyle = "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] outline-accent";
const tabs = ["Report", "AI roadmap", "My helpers", "Progress"] as const;
type Tab = (typeof tabs)[number];

export function PersonalWorkspace({ initialEmployee = "", calendarResult = "" }: { initialEmployee?: string; calendarResult?: string }) {
  const hydrated = useHydrated();
  const interviews = useStore((state) => state.interviews);
  const workspace = useStore((state) => state.workspace);
  const [selected, setSelected] = useState(initialEmployee);
  const [returning, setReturning] = useState(Boolean(calendarResult));
  const people = interviews.filter((interview) => interview.status === "completed");
  const employee = people.find((interview) => interview.id === selected) ?? people[0];

  if (!hydrated) return <p className="text-muted">Loading your workspace…</p>;
  if (!employee)
    return (
      <Empty icon={<BookOpen />} title="Your journey starts with a conversation" action={<Link href="/discovery" className="text-accent">Go to Discovery →</Link>}>
        Complete an employee interview to create their report, AI roadmap, and personal helper.
      </Empty>
    );

  return (
    <>
      <PageHeader
        title="My work"
        actions={
          <label className="flex items-center gap-2 text-xs text-muted">
            Employee
            <select
              aria-label="Employee profile"
              className={selectStyle}
              value={employee.id}
              onChange={(event) => {
                setSelected(event.target.value);
                setReturning(false);
                window.history.replaceState(null, "", `/my-work?employee=${encodeURIComponent(event.target.value)}`);
              }}
            >
              {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
            </select>
          </label>
        }
      />
      <EmployeeWork key={employee.id} employee={employee} workspace={workspace} interviews={interviews} returning={returning} calendarResult={returning ? calendarResult : ""} />
    </>
  );
}

function EmployeeWork({ employee, workspace, interviews, returning, calendarResult }: { employee: Interview; workspace: Workspace; interviews: Interview[]; returning: boolean; calendarResult: string }) {
  const { opportunities } = useDecisions();
  const roi = useStore((state) => state.roi);
  const allHelpers = useStore((state) => state.personalHelpers);
  const draft = useStore((state) => state.helperDrafts[employee.id]);
  const saveDraft = useStore((state) => state.saveHelperDraft);
  const [tab, setTab] = useState<Tab>("Report");
  const [building, setBuilding] = useState(returning && Boolean(draft));
  const helpers = allHelpers.filter((helper) => helper.interviewId === employee.id);
  const profile = buildEmployeeProfile(employee, workspace, interviews, opportunities, roi);
  const progress = progressFor(helpers);

  function begin(taskId?: string, helper?: PersonalHelper) {
    const next: HelperDraft = helper
      ? { helperId: helper.id, step: 2, config: helper.config }
      : { step: 0, config: initialConfig(employee, workspace, taskId ?? profile.primary?.taskIds[0]) };
    saveDraft(employee.id, next);
    setBuilding(true);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(employeeReportMarkdown(profile));
    toast.success("Personal report copied");
  }

  if (building && draft)
    return (
      <MeetingBuilder employee={employee} workspace={workspace} draft={draft} calendarResult={calendarResult} onClose={() => setBuilding(false)} onSaved={() => { setBuilding(false); setTab("My helpers"); }} />
    );

  return (
    <div className="enter space-y-7">
      <section className="rounded-2xl bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2"><Badge tone="accent">Personal AI workspace</Badge>{workspace.synthetic && <Badge tone="warn">Demo employee</Badge>}<Badge>{profile.report.quality}/100 evidence</Badge></div>
            <h2 className="font-display text-3xl tracking-tight">{employee.name}</h2>
            <p className="mt-1 text-sm text-white/65">{employee.role} · {employee.team} · {workspace.company}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">Your interview has been turned into a personal work report, a prioritized AI roadmap, and a helper you can shape around real work.</p>
          </div>
          <div className="grid min-w-56 grid-cols-2 gap-3 text-right">
            <div><div className="text-2xl font-semibold">{profile.report.totalHoursPerWeek}</div><div className="text-xs text-white/55">hours/week mapped</div></div>
            <div><div className="text-2xl font-semibold">{profile.estimatedCapacityPerMonth}</div><div className="text-xs text-white/55">hours/month potential</div></div>
          </div>
        </div>
      </section>

      <div className="flex gap-6 overflow-x-auto border-b border-line" role="tablist" aria-label="Personal workspace">
        {tabs.map((name) => <button key={name} role="tab" aria-selected={tab === name} className={`shrink-0 pb-3 text-sm ${tab === name ? "border-b-2 border-accent font-medium text-accent" : "text-muted"}`} onClick={() => setTab(name)}>{name}{name === "My helpers" && helpers.length > 0 ? ` (${helpers.length})` : ""}</button>)}
      </div>

      {tab === "Report" && <ReportView profile={profile} onCopy={copyReport} />}
      {tab === "AI roadmap" && <RoadmapView profile={profile} draft={draft} onBuild={begin} onContinue={() => setBuilding(true)} />}
      {tab === "My helpers" && <HelpersView helpers={helpers} draft={draft} onBuild={() => begin()} onContinue={() => setBuilding(true)} onOpen={(helper) => begin(undefined, helper)} />}
      {tab === "Progress" && <ProgressView helpers={helpers} progress={progress} />}
    </div>
  );
}

function ReportView({ profile, onCopy }: { profile: EmployeeProfile; onCopy: () => void }) {
  const { employee, report, company } = profile;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-[16px] font-semibold">Personal work report</h3><p className="mt-1 text-sm text-muted">Everything below comes from this employee’s interview and the shared company analysis.</p></div>
        <div className="flex gap-2"><Button icon={<Copy size={14} />} onClick={onCopy}>Copy report</Button><Button icon={<Printer size={14} />} onClick={() => window.print()}>Print</Button></div>
      </div>

      <Card className="grid gap-6 p-6 sm:grid-cols-4">
        <Stat label="Recurring work" value={`${report.totalHoursPerMonth} h/mo`} sub={`${report.taskCount} tasks reported`} tone="accent" />
        <Stat label="Personal opportunities" value={profile.opportunities.length} sub="linked to company roadmap" />
        <Stat label="Capacity potential" value={`${profile.estimatedCapacityPerMonth} h/mo`} sub="at expected adoption" />
        <Stat label="Evidence quality" value={`${report.quality}/100`} sub="specificity + traceability" />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold">Work captured in the interview</h3><p className="mt-1 text-xs text-muted">Every task stays linked to the employee’s own words.</p></div>
          <div className="divide-y divide-line">
            {employee.tasks.map((task) => {
              const matched = profile.opportunities.find((item) => item.taskIds.includes(task.id));
              return <div key={task.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{task.name}</div><div className="mt-1 text-xs text-muted">{task.process} · {task.tools.join(", ") || "No tools recorded"}</div></div><div className="flex items-center gap-2"><span className="text-sm font-medium tabular-nums">{task.hoursPerWeek} h/wk</span>{matched && <SolutionBadge solution={matched.solution} />}</div></div><blockquote className="mt-3 border-l-2 border-accent pl-3 text-[13px] leading-5 text-ink-2">“{task.pain || "No friction example was recorded."}”</blockquote></div>;
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <ContextCard icon={Gauge} title="AI today" text={report.currentAi} />
          <ContextCard icon={Network} title="Where work waits" text={report.dependencies} />
          <ContextCard icon={ShieldCheck} title="Keep human" text={report.humanBoundary} human />
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><Target size={16} className="text-accent" />Company context</div>
            <p className="mt-3 text-sm text-ink-2">{company.name} · {company.industry} · {company.employees}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{employee.team}: {company.teamSample} sampled{company.teamSize ? ` from ${company.teamSize} employees` : ""}. Company sample: {company.sampleTotal} completed interviews.</p>
            <div className="mt-4 border-t border-line pt-4"><div className="text-xs font-medium text-muted">Top company priorities</div><div className="mt-2 flex flex-wrap gap-1.5">{company.priorities.map((priority) => <Badge key={priority}>{priority}</Badge>)}</div></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContextCard({ icon: Icon, title, text, human = false }: { icon: typeof Gauge; title: string; text: string; human?: boolean }) {
  return <Card className="p-5"><div className={`flex items-center gap-2 text-sm font-semibold ${human ? "text-human" : ""}`}><Icon size={16} />{title}</div><p className="mt-2 text-sm leading-6 text-ink-2">{text}</p></Card>;
}

function RoadmapView({ profile, draft, onBuild, onContinue }: { profile: EmployeeProfile; draft?: HelperDraft; onBuild: (taskId?: string) => void; onContinue: () => void }) {
  return (
    <div className="space-y-6">
      {profile.primary && <Card className="overflow-hidden"><div className="grid gap-6 bg-accent p-6 text-white lg:grid-cols-[1.5fr_1fr]"><div><div className="text-xs font-medium text-white/65">RECOMMENDED FIRST MOVE</div><h3 className="mt-2 font-display text-2xl">{profile.primary.action}</h3><p className="mt-3 text-sm leading-6 text-white/75">Based on {profile.primary.hoursPerWeek} hours/week of reported work and the company’s {profile.primary.process.toLowerCase()} opportunity.</p></div><div className="rounded-xl bg-white/10 p-4"><div className="text-xs text-white/60">Potential at expected adoption</div><div className="mt-1 text-3xl font-semibold">{profile.primary.capacityHoursPerMonth} h/mo</div><div className="mt-3 text-xs leading-5 text-white/70">Human checkpoint: {profile.primary.checkpoint}</div></div></div><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex gap-2"><SolutionBadge solution={profile.primary.solution} /><Badge>{profile.primary.phaseLabel} · {profile.primary.window}</Badge></div><Button variant="accent" icon={<Sparkles size={15} />} onClick={() => draft ? onContinue() : onBuild(profile.primary!.taskIds[0])}>{draft ? "Continue my helper" : "Build this helper"}</Button></div></Card>}

      <div><h3 className="mb-3 text-sm font-semibold">Your 90-day adoption roadmap</h3><div className="grid gap-3 lg:grid-cols-3">{profile.roadmap.map((stage, index) => <Card key={stage.id} className="p-5"><div className="flex items-center justify-between"><span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-white">{index + 1}</span><Badge>{stage.window}</Badge></div><div className="mt-4 text-xs font-medium text-accent">{stage.label}</div><h4 className="mt-1 font-semibold">{stage.title}</h4><p className="mt-2 text-[13px] leading-5 text-muted">{stage.detail}</p><p className="mt-4 border-t border-line pt-3 text-xs font-medium text-ink-2">{stage.outcome}</p></Card>)}</div></div>
      <div><h3 className="mb-3 text-sm font-semibold">Every recommendation for this employee</h3><div className="space-y-3">{profile.opportunities.map((item) => <OpportunityCard key={item.id} item={item} onBuild={onBuild} />)}</div></div>
    </div>
  );
}

function OpportunityCard({ item, onBuild }: { item: PersonalOpportunity; onBuild: (taskId?: string) => void }) {
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{item.process}</h4><SolutionBadge solution={item.solution} /><Badge>{item.phaseLabel}</Badge></div><p className="mt-2 text-sm text-ink-2">{item.action}</p><p className="mt-2 text-xs text-muted">{item.taskNames.join(" · ")} · {item.hoursPerWeek} h/week</p><blockquote className="mt-3 text-[12.5px] leading-5 text-muted">“{item.evidence[0]}”</blockquote></div><div className="w-full shrink-0 rounded-lg bg-paper p-3 sm:w-56"><div className="text-xs text-muted">Expected capacity</div><div className="mt-1 text-xl font-semibold">{item.capacityHoursPerMonth} h/mo</div><div className="mt-2 text-xs leading-5 text-muted">Measure: {item.metric}</div>{item.solution !== "human" && <Button className="mt-3 w-full" size="sm" onClick={() => onBuild(item.taskIds[0])}>Build helper</Button>}</div></div><div className="mt-4 rounded-lg bg-human-soft/50 px-3 py-2 text-xs text-ink-2"><span className="font-medium text-human">Human checkpoint: </span>{item.checkpoint}</div></Card>;
}

function HelpersView({ helpers, draft, onBuild, onContinue, onOpen }: { helpers: PersonalHelper[]; draft?: HelperDraft; onBuild: () => void; onContinue: () => void; onOpen: (helper: PersonalHelper) => void }) {
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Personal helpers</h3><p className="mt-1 text-sm text-muted">Reusable instructions, employee context, approved sources, and a human checkpoint.</p></div><Button onClick={draft ? onContinue : onBuild} icon={<ArrowRight size={14} />}>{draft ? "Continue draft" : "New helper"}</Button></div>{!helpers.length ? <Empty icon={<Wrench />} title="Build the first personalized helper" action={<Button variant="accent" onClick={draft ? onContinue : onBuild}>Build my helper</Button>}>Start from the highest-value task in this employee’s roadmap, test it, and keep the employee in control.</Empty> : helpers.map((helper) => <Card key={helper.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><Badge tone="skill">Personal skill · Run manually</Badge><h3 className="mt-2 font-semibold">{helper.config.name}</h3><p className="mt-1 max-w-lg text-sm text-muted">{helper.config.goal}</p><p className="mt-3 text-xs text-faint">{helper.runs.length} saved {helper.runs.length === 1 ? "run" : "runs"} · Context saved in this browser</p></div><Button variant="accent" onClick={() => onOpen(helper)} icon={<ChevronRight size={15} />}>Open & run</Button></Card>)}</div>;
}

function ProgressView({ helpers, progress }: { helpers: PersonalHelper[]; progress: ReturnType<typeof progressFor> }) {
  return <div className="space-y-5"><Card className="grid gap-5 p-6 sm:grid-cols-3"><Stat label="Saved runs" value={progress.runs} sub="AI drafts and local templates" /><Stat label="Marked useful" value={progress.useful} sub="Employee feedback" /><Stat label="Time saved · self-reported" value={`${progress.minutes} min`} sub={`${progress.reports} reports · not measured ROI`} /></Card><p className="text-sm text-muted">Progress belongs to the employee: review each output, record whether it helped, and use that evidence to change the next version.</p>{!progress.runs ? <Empty icon={<Check />} title="No helper runs yet">Run the first helper on real work to start measuring usefulness.</Empty> : helpers.flatMap((helper) => helper.runs.map((run) => <RunReview key={run.id} helper={helper} run={run} />)).reverse()}</div>;
}

function RunReview({ helper, run }: { helper: PersonalHelper; run: HelperRun }) {
  const review = useStore((state) => state.reviewHelperRun);
  const [open, setOpen] = useState(false);
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{run.source} context</Badge><Badge tone={run.mode === "ai" ? "accent" : "warn"}>{run.mode === "ai" ? "AI draft" : "Local template"}</Badge></div><h3 className="mt-2 text-sm font-semibold">{run.meetingTitle}</h3><p className="mt-1 text-xs text-muted">{helper.config.name} · {new Date(run.createdAt).toLocaleDateString()}</p></div><Button size="sm" onClick={() => setOpen(!open)}>{open ? "Hide output" : "View output"}</Button></div>{open && <div className="mt-4 rounded-lg bg-paper p-4 text-sm leading-6"><p>{run.brief.summary}</p>{(["agenda", "questions", "checklist", "unknowns"] as const).map((key) => run.brief[key].length ? <div key={key} className="mt-3"><strong>{key === "agenda" ? "Suggested approach" : key === "questions" ? "Questions" : key === "checklist" ? "Checklist" : "Unknowns"}</strong><ul className="list-disc pl-5">{run.brief[key].map((line, index) => <li key={index}>{line}</li>)}</ul></div> : null)}</div>}<div className="mt-5 flex flex-wrap items-end gap-4"><div><p className="mb-2 text-xs text-muted">Was this useful?</p><div className="flex gap-2"><Button size="sm" variant={run.feedback === "useful" ? "accent" : "secondary"} aria-pressed={run.feedback === "useful"} onClick={() => review(helper.id, run.id, { feedback: "useful" })}>Yes, useful</Button><Button size="sm" variant={run.feedback === "needs-work" ? "accent" : "secondary"} aria-pressed={run.feedback === "needs-work"} onClick={() => review(helper.id, run.id, { feedback: "needs-work" })}>Needs work</Button></div></div><Field label="Minutes saved (optional)"><Input aria-label={`Minutes saved for ${run.meetingTitle}`} type="number" min={0} max={1440} className="max-w-40" placeholder="Your estimate" value={run.minutesSaved ?? ""} onChange={(event) => { const value = Number(event.target.value); if (event.target.value === "" || (Number.isFinite(value) && value >= 0 && value <= 1440)) review(helper.id, run.id, { minutesSaved: event.target.value === "" ? undefined : value }); }} /></Field></div></Card>;
}
