"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, Sparkles, Zap } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import type { Interview, Workspace } from "@/lib/types";
import type { HelperDraft, HelperRun, PersonalHelper } from "@/lib/personal/types";
import { initialConfig, progressFor, recommendedTask } from "@/lib/personal/meeting";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Stat } from "../ui";
import { MeetingBuilder } from "./meeting-builder";

export const selectStyle = "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] outline-accent";

export function PersonalWorkspace({ initialEmployee = "", calendarResult = "" }: { initialEmployee?: string; calendarResult?: string }) {
  const hydrated = useHydrated();
  const interviews = useStore((s) => s.interviews);
  const workspace = useStore((s) => s.workspace);
  const [selected, setSelected] = useState(initialEmployee);
  const [returning, setReturning] = useState(Boolean(calendarResult));
  const people = interviews.filter((i) => i.status === "completed");
  const employee = people.find((i) => i.id === selected) ?? people.find((i) => i.name === "Ryan Park") ?? people[0];
  if (!hydrated) return <p className="text-muted">Loading your workspace…</p>;
  if (!employee) return <Empty icon={<BookOpen />} title="Your journey starts with a conversation" action={<Link href="/discovery" className="text-accent">Go to Discovery →</Link>}>Complete an employee interview to discover opportunities grounded in their work.</Empty>;
  return <>
    <PageHeader title="My work" actions={<label className="flex items-center gap-2 text-xs text-muted">Demo profile<select aria-label="Employee profile" className={selectStyle} value={employee.id} onChange={(e) => { setSelected(e.target.value); setReturning(false); window.history.replaceState(null, "", `/my-work?employee=${encodeURIComponent(e.target.value)}`); }}>{people.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}</select></label>} />
    <EmployeeWork key={employee.id} employee={employee} workspace={workspace} returning={returning} calendarResult={returning ? calendarResult : ""} />
  </>;
}

function EmployeeWork({ employee, workspace, returning, calendarResult }: { employee: Interview; workspace: Workspace; returning: boolean; calendarResult: string }) {
  const allHelpers = useStore((s) => s.personalHelpers);
  const draft = useStore((s) => s.helperDrafts[employee.id]);
  const saveDraft = useStore((s) => s.saveHelperDraft);
  const [tab, setTab] = useState("For you");
  const [building, setBuilding] = useState(returning && Boolean(draft));
  const helpers = allHelpers.filter((h) => h.interviewId === employee.id);
  const task = recommendedTask(employee);
  const progress = progressFor(helpers);
  function begin(helper?: PersonalHelper) {
    const next: HelperDraft = helper ? { helperId: helper.id, step: 2, config: helper.config } : { step: 0, config: initialConfig(employee, workspace) };
    saveDraft(employee.id, next);
    setBuilding(true);
  }
  if (building && draft) return <MeetingBuilder employee={employee} workspace={workspace} draft={draft} calendarResult={calendarResult} onClose={() => setBuilding(false)} onSaved={() => { setBuilding(false); setTab("My helpers"); }} />;
  return <div className="enter space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2"><Badge tone="accent">Your AI journey</Badge>{workspace.synthetic && <Badge tone="warn">Sample interview</Badge>}</div><h2 className="font-display text-3xl tracking-tight">More space for your best work, {employee.name.split(" ")[0]}.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Turn what you shared in your interview into small, useful changes to your day. You choose what AI helps with and what stays with you.</p></div>
    </div>
    <div className="flex gap-6 border-b border-line" role="tablist" aria-label="Personal workspace">{["For you", "My helpers", "My progress"].map((name) => <button key={name} role="tab" aria-selected={tab === name} className={`pb-3 text-sm ${tab === name ? "border-b-2 border-accent font-medium text-accent" : "text-muted"}`} onClick={() => setTab(name)}>{name}{name === "My helpers" && helpers.length > 0 ? ` (${helpers.length})` : ""}</button>)}</div>
    {tab === "For you" && <>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><CalendarDays size={24} /></div><Badge tone="skill">First skill · 5 steps</Badge></div>
          <p className="text-xs font-medium tracking-wide text-accent uppercase">A place to start</p><h3 className="mt-2 font-display text-2xl">Walk into your next meeting prepared.</h3><p className="mt-3 max-w-lg text-sm leading-6 text-muted">Build a helper that brings together your meeting context, suggests questions, and gives you a brief to review. Shape it around the way you work.</p>
          <div className="my-6 rounded-xl bg-paper p-4"><div className="mb-2 text-xs font-medium text-ink-2">From your interview</div><p className="text-sm font-medium">{task?.name || "Your daily work"}</p><p className="mt-1 text-sm leading-6 text-muted">{task?.pain || employee.context || "Start with a recurring conversation you want to prepare for."}</p><p className="mt-3 text-xs text-faint">Suggested starting point · confirm the fit in step 1</p></div>
          <div className="flex flex-wrap items-center gap-3"><Button variant="accent" icon={<Sparkles size={15} />} onClick={() => draft ? setBuilding(true) : begin()}>{draft ? "Continue your helper" : "Build my first skill"}</Button><span className="text-xs text-muted">Start with a sample meeting</span></div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5"><p className="text-xs font-medium text-muted">Your starting point</p><h3 className="mt-2 text-sm font-semibold">{employee.role} · {employee.team}</h3><p className="mt-3 text-sm leading-6 text-muted">{employee.aiToday || "You haven’t shared your current AI experience yet. Start with one small task."}</p><div className="mt-4 border-t border-line pt-4"><Badge tone="human">Always yours</Badge><p className="mt-2 text-sm leading-6">{employee.keepHuman || "Your judgment, decisions, and final approval."}</p></div></Card>
          <Card className="p-5"><p className="text-xs font-medium text-muted">Your first roadmap</p><ol className="mt-4 space-y-4">{["Build a meeting preparation skill", "Try it on a real meeting and refine it", "Record what helped and repeat"].map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] text-accent">{i + 1}</span>{s}</li>)}</ol></Card>
        </div>
      </div>
      <div><h3 className="mb-3 text-sm font-semibold">Learn by doing</h3><div className="grid gap-3 sm:grid-cols-3">{[{ title: "Skill", icon: BookOpen, text: "A reusable recipe: your instructions, context, and preferred result. You run it when you need it.", badge: "Build this today" }, { title: "Automation", icon: Zap, text: "A routine triggered by an event or a schedule, such as preparing a brief before every meeting.", badge: "A next step" }, { title: "Agent", icon: Sparkles, text: "A helper that chooses steps and uses tools toward a goal, within permissions you set.", badge: "A next step" }].map(({ title, icon: Icon, text, badge }) => <Card key={title} className="p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Icon size={16} className="text-accent" />{title}</div><p className="my-3 text-[13px] leading-6 text-muted">{text}</p><Badge>{badge}</Badge></Card>)}</div></div>
    </>}
    {tab === "My helpers" && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Your reusable recipes. Choose a meeting each time you run one.</p><Button onClick={() => draft ? setBuilding(true) : begin()} icon={<ArrowRight size={14} />}>{draft ? "Continue draft" : "New meeting helper"}</Button></div>{!helpers.length ? <Empty icon={<BookOpen />} title="Your first helper starts here" action={<Button variant="accent" onClick={() => draft ? setBuilding(true) : begin()}>Build a meeting skill</Button>}>Create it once, refine it as you learn, and reuse it for your next meeting.</Empty> : helpers.map((helper) => <Card key={helper.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><Badge tone="skill">Skill · Run manually</Badge><h3 className="mt-2 font-semibold">{helper.config.name}</h3><p className="mt-1 max-w-lg text-sm text-muted">{helper.config.goal}</p><p className="mt-3 text-xs text-faint">{helper.runs.length} saved {helper.runs.length === 1 ? "run" : "runs"} · Instructions and meeting details saved in this browser</p></div><Button variant="accent" onClick={() => begin(helper)} icon={<ChevronRight size={15} />}>Open & run</Button></Card>)}</div>}
    {tab === "My progress" && <div className="space-y-5"><Card className="grid gap-5 p-6 sm:grid-cols-3"><Stat label="Saved runs" value={progress.runs} sub="Includes sample and template runs" /><Stat label="Marked useful" value={progress.useful} sub="Your feedback" /><Stat label="Time saved · self-reported" value={`${progress.minutes} min`} sub={`${progress.reports} reports · not a measured ROI`} /></Card><p className="text-sm text-muted">After trying a brief, record whether it helped. Use your experience to improve the next version.</p>{!progress.runs ? <Empty icon={<Check />} title="Small steps, visible progress">Save your first meeting brief to start reflecting on what works.</Empty> : helpers.flatMap((helper) => helper.runs.map((run) => <RunReview key={run.id} helper={helper} run={run} />)).reverse()}</div>}
  </div>;
}

function RunReview({ helper, run }: { helper: PersonalHelper; run: HelperRun }) {
  const review = useStore((s) => s.reviewHelperRun);
  const [open, setOpen] = useState(false);
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{run.source} meeting</Badge><Badge tone={run.mode === "ai" ? "accent" : "warn"}>{run.mode === "ai" ? "AI draft" : "Template worksheet"}</Badge></div><h3 className="mt-2 text-sm font-semibold">{run.meetingTitle}</h3><p className="mt-1 text-xs text-muted">{helper.config.name} · {new Date(run.createdAt).toLocaleDateString()}</p></div><Button size="sm" onClick={() => setOpen(!open)}>{open ? "Hide brief" : "View brief"}</Button></div>{open && <div className="mt-4 rounded-lg bg-paper p-4 text-sm leading-6"><p>{run.brief.summary}</p>{(["agenda", "questions", "checklist", "unknowns"] as const).map((key) => run.brief[key].length ? <div key={key} className="mt-3"><strong className="capitalize">{key}</strong><ul className="list-disc pl-5">{run.brief[key].map((line, i) => <li key={i}>{line}</li>)}</ul></div> : null)}</div>}<div className="mt-5 flex flex-wrap items-end gap-4"><div><p className="mb-2 text-xs text-muted">Was this useful?</p><div className="flex gap-2"><Button size="sm" variant={run.feedback === "useful" ? "accent" : "secondary"} aria-pressed={run.feedback === "useful"} onClick={() => review(helper.id, run.id, { feedback: "useful" })}>Yes, useful</Button><Button size="sm" variant={run.feedback === "needs-work" ? "accent" : "secondary"} aria-pressed={run.feedback === "needs-work"} onClick={() => review(helper.id, run.id, { feedback: "needs-work" })}>Needs work</Button></div></div><Field label="Minutes saved (optional)"><Input aria-label={`Minutes saved for ${run.meetingTitle}`} type="number" min={0} max={1440} className="max-w-40" placeholder="Your estimate" value={run.minutesSaved ?? ""} onChange={(e) => { const n = Number(e.target.value); if (e.target.value === "" || (Number.isFinite(n) && n >= 0 && n <= 1440)) review(helper.id, run.id, { minutesSaved: e.target.value === "" ? undefined : n }); }} /></Field></div></Card>;
}
