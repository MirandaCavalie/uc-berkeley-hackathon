"use client";

import clsx from "clsx";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, Copy, Lightbulb, Plus, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { initialConfig, progressFor } from "@/lib/personal/meeting";
import { buildEmployeeProfile } from "@/lib/personal/profile";
import { CALENDAR_APP, aiLevel, appsFor, findApp, lessonsFor, levels, type AppDef, type Lesson } from "@/lib/personal/coach";
import type { HelperDraft, HelperRun, PersonalHelper } from "@/lib/personal/types";
import { useHydrated, useStore } from "@/lib/store";
import type { Interview, Workspace } from "@/lib/types";
import { useDecisions } from "@/lib/use-decisions";
import { Button, Card, Empty, Field, Input, PageHeader, SectionTitle, SolutionBadge } from "../ui";
import { AppIcon, FlowBuilder, Result, flowFor, goalFor, requestJson, selectStyle, useGoogleStatus } from "./flow-builder";

const tabs = ["Learn", "My helpers", "Progress"] as const;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
type Tab = (typeof tabs)[number];

export function PersonalWorkspace({ initialEmployee = "", calendarResult = "" }: { initialEmployee?: string; calendarResult?: string }) {
  const hydrated = useHydrated();
  const interviews = useStore((state) => state.interviews);
  const workspace = useStore((state) => state.workspace);
  const [selected, setSelected] = useState(initialEmployee);
  const people = interviews.filter((interview) => interview.status === "completed");
  const employee = people.find((interview) => interview.id === selected) ?? people[0];

  if (!hydrated) return <p className="text-muted">Loading your workspace…</p>;
  if (!employee)
    return (
      <Empty icon={<BookOpen />} title="Your journey starts with a conversation" action={<Link href="/discovery" className="text-accent">Go to Discovery →</Link>}>
        Complete an employee interview to get a personal AI coach and helpers.
      </Empty>
    );

  return (
    <>
      <PageHeader
        title="My work"
        actions={
          <select
            aria-label="Employee profile"
            className={clsx(selectStyle, "w-auto")}
            value={employee.id}
            onChange={(event) => {
              setSelected(event.target.value);
              window.history.replaceState(null, "", `/my-work?employee=${encodeURIComponent(event.target.value)}`);
            }}
          >
            {people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
          </select>
        }
      />
      <EmployeeWork key={employee.id} employee={employee} workspace={workspace} interviews={interviews} calendarResult={calendarResult} />
    </>
  );
}

function EmployeeWork({ employee, workspace, interviews, calendarResult }: { employee: Interview; workspace: Workspace; interviews: Interview[]; calendarResult: string }) {
  const { opportunities } = useDecisions();
  const roi = useStore((state) => state.roi);
  const allHelpers = useStore((state) => state.personalHelpers);
  const draft = useStore((state) => state.helperDrafts[employee.id]);
  const saveDraft = useStore((state) => state.saveHelperDraft);
  const connected = useStore((state) => state.connectedApps[employee.id]) ?? [];
  const [tab, setTab] = useState<Tab>(calendarResult ? "My helpers" : "Learn");
  const [building, setBuilding] = useState(Boolean(calendarResult && draft));
  const helpers = allHelpers.filter((helper) => helper.interviewId === employee.id);
  const profile = buildEmployeeProfile(employee, workspace, interviews, opportunities, roi);
  const lessons = lessonsFor(employee, workspace, profile.opportunities);
  const apps = appsFor(employee);
  const progress = progressFor(helpers);
  const level = aiLevel(employee, helpers);

  function begin(taskId?: string, helper?: PersonalHelper) {
    if (helper) {
      saveDraft(employee.id, { helperId: helper.id, step: 2, config: helper.config });
    } else {
      const base = initialConfig(employee, workspace, taskId ?? lessons.find((l) => l.solution !== "human")?.task.id);
      const lesson = lessons.find((l) => l.task.id === base.taskId);
      const next: HelperDraft = {
        step: 0,
        config: {
          ...base,
          goal: lesson ? goalFor(lesson.task.name) : base.goal,
          flow: flowFor(lesson, apps, connected, employee.keepHuman),
          source: "manual",
          meeting: { id: "manual", title: lesson ? `${lesson.task.name} example` : "Example", start: "", attendees: [], description: lesson?.task.pain ?? "", source: "manual" },
        },
      };
      saveDraft(employee.id, next);
    }
    setTab("My helpers");
    setBuilding(true);
  }

  if (building && draft)
    return (
      <FlowBuilder
        employee={employee}
        workspace={workspace}
        draft={draft}
        apps={apps}
        connected={connected}
        lessons={lessons}
        onClose={() => setBuilding(false)}
        onSaved={() => setBuilding(false)}
      />
    );

  const firstName = employee.name.split(" ")[0];
  const aiTasks = lessons.filter((l) => l.solution !== "human").length;

  return (
    <div className="enter space-y-8">
      <Card className="overflow-hidden">
        <div className="p-6">
          <div className="text-[12.5px] text-muted">{employee.role} · {employee.team} · {workspace.company}</div>
          <p className="mt-1 max-w-3xl text-[17px] leading-relaxed text-ink">
            Hi {firstName}. AI can take the repetitive part of <span className="font-semibold">{aiTasks} of your {lessons.length} tasks</span>. You keep the judgment
            {employee.keepHuman ? <span className="text-muted">: {lowerFirst(employee.keepHuman.split(/(?<=\.)\s/)[0].replace(/\.$/, ""))}</span> : null}.
          </p>
        </div>
        <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
          {[
            { label: "Hours / week mapped", value: profile.report.totalHoursPerWeek },
            { label: "Could come back / month", value: `${profile.estimatedCapacityPerMonth} h` },
            { label: "Helpers", value: helpers.length },
            { label: "Useful runs", value: progress.useful },
          ].map((s) => (
            <div key={s.label} className="px-6 py-4">
              <div className="text-[12.5px] text-muted">{s.label}</div>
              <div className="mt-1 text-[24px] leading-none font-semibold tracking-tight tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-6 border-b border-line" role="tablist" aria-label="My work">
        {tabs.map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={clsx("-mb-px shrink-0 border-b-2 pb-3 text-[13.5px]", tab === name ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink")}>
            {name}
            {name === "My helpers" && helpers.length > 0 && <span className="ml-1.5 text-faint">{helpers.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Learn" && <LearnView lessons={lessons} level={level} onBuild={begin} />}
      {tab === "My helpers" && <HelpersView employee={employee} apps={apps} connected={connected} helpers={helpers} lessons={lessons} draft={draft} onBuild={begin} onContinue={() => setBuilding(true)} />}
      {tab === "Progress" && <ProgressView helpers={helpers} progress={progress} />}
    </div>
  );
}

function LearnView({ lessons, level, onBuild }: { lessons: Lesson[]; level: number; onBuild: (taskId?: string) => void }) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle title="Your AI level" />
        <Card className="p-5">
          <ol className="grid grid-cols-4 gap-1.5">
            {levels.map((l, i) => (
              <li key={l.label}>
                <div className={clsx("h-1.5 rounded-full", i <= level ? "bg-accent" : "bg-sunken")} />
                <div className={clsx("mt-2 text-[12px]", i === level ? "font-semibold text-ink" : "text-muted")}>{l.label}</div>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-2">
            <ArrowRight className="size-3.5 text-accent" />
            <span><span className="font-medium">Next step:</span> {levels[level].next}</span>
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle title="Get better at each part of your job" meta={lessons.length} />
        <div className="space-y-2">
          {lessons.map((l, i) => <LessonCard key={l.task.id} lesson={l} defaultOpen={i === 0} onBuild={onBuild} />)}
        </div>
      </section>
    </div>
  );
}

function LessonCard({ lesson: l, defaultOpen, onBuild }: { lesson: Lesson; defaultOpen: boolean; onBuild: (taskId?: string) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  async function copy() {
    try {
      await navigator.clipboard.writeText(l.prompt);
      toast.success("Prompt copied", { description: "Paste it into your AI tool and add today's example." });
    } catch {
      toast.error("Clipboard unavailable. Select the prompt to copy it.");
    }
  }
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{l.task.name}</span>
            <SolutionBadge solution={l.solution} />
          </div>
          {l.task.pain && <div className="mt-0.5 truncate text-[12.5px] text-muted">“{l.task.pain}”</div>}
        </div>
        <div className="hidden text-right text-[13px] font-semibold tabular-nums sm:block">
          {l.task.hoursPerWeek} <span className="font-normal text-muted">h/wk</span>
        </div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="enter space-y-5 border-t border-line p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-accent-soft/50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-accent"><Sparkles className="size-3.5" /> AI can</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{l.aiDoes}</p>
            </div>
            <div className="rounded-lg bg-human-soft/60 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-human"><UserCheck className="size-3.5" /> You keep</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{l.youKeep}</p>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12px] font-medium text-muted">Try this prompt today</div>
              <Button size="sm" variant="ghost" icon={<Copy className="size-3.5" />} onClick={copy}>Copy</Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg bg-paper p-4 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]">{l.prompt}</pre>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex max-w-xl gap-2 text-[12.5px] leading-relaxed text-ink-2">
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" />
              {l.tip}
            </p>
            {l.solution !== "human" && (
              <Button variant="accent" size="sm" icon={<Plus className="size-3.5" />} onClick={() => onBuild(l.task.id)}>Make it a helper</Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function HelpersView({ employee, apps, connected, helpers, lessons, draft, onBuild, onContinue }: { employee: Interview; apps: AppDef[]; connected: string[]; helpers: PersonalHelper[]; lessons: Lesson[]; draft?: HelperDraft; onBuild: (taskId?: string, helper?: PersonalHelper) => void; onContinue: () => void }) {
  const toggleApp = useStore((s) => s.toggleApp);
  const [status, setStatus] = useGoogleStatus(employee.id);
  const [busy, setBusy] = useState<string | null>(null);
  const isConnected = (app: AppDef) => (app.id === CALENDAR_APP && status?.connected) || connected.includes(app.id);
  const built = new Set(helpers.map((h) => h.config.taskId));
  const suggestions = lessons.filter((l) => l.solution !== "human" && !built.has(l.task.id)).slice(0, 3);

  async function connect(app: AppDef) {
    if (app.id === CALENDAR_APP && status?.configured) {
      setBusy(app.id);
      try {
        if (status.connected) {
          await requestJson("/api/integrations/google/disconnect", { method: "POST" });
          setStatus({ ...status, connected: false });
        } else {
          const data = await requestJson("/api/integrations/google/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interviewId: employee.id }) });
          window.location.assign(data.url);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Connection failed.");
      } finally {
        setBusy(null);
      }
      return;
    }
    toggleApp(employee.id, app.id, !connected.includes(app.id));
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle title="Your apps" meta={`${apps.filter(isConnected).length} of ${apps.length} connected`} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const on = isConnected(app);
            const usedIn = employee.tasks.filter((t) => t.tools.some((tool) => tool.toLowerCase() === app.name.toLowerCase())).length;
            return (
              <Card key={app.id} className="flex items-center gap-3 p-3">
                <AppIcon app={app} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{app.name}</div>
                  <div className="text-[11.5px] text-muted">{usedIn ? `In ${usedIn} of your tasks` : "Read your meetings"}</div>
                </div>
                <Button size="sm" variant={on ? "secondary" : "accent"} loading={busy === app.id} onClick={() => connect(app)} icon={on ? <Check className="size-3.5 text-good" /> : undefined}>
                  {on ? "Connected" : "Connect"}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          title="My helpers"
          meta={helpers.length || undefined}
          action={<Button size="sm" icon={<Plus className="size-3.5" />} onClick={draft ? onContinue : () => onBuild()}>{draft ? "Continue draft" : "New helper"}</Button>}
        />
        {helpers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-8 text-center text-[13px] text-muted">
            No helpers yet. Start from a suggestion below. Each one is a small flow you can read, test and change.
          </div>
        ) : (
          <div className="space-y-2">
            {helpers.map((h) => (
              <Card key={h.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold tracking-tight">{h.config.name}</div>
                  <FlowChain apps={apps} helper={h} />
                </div>
                <span className="text-[12px] text-muted tabular-nums">{h.runs.length} {h.runs.length === 1 ? "run" : "runs"}</span>
                <Button size="sm" variant="accent" onClick={() => onBuild(undefined, h)}>Open</Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {suggestions.length > 0 && (
        <section>
          <SectionTitle title="Suggested from your interview" />
          <div className="grid gap-2 md:grid-cols-3">
            {suggestions.map((l) => {
              const flow = flowFor(l, apps, connected, employee.keepHuman);
              const app = findApp(apps, flow.trigger.app);
              return (
                <Card key={l.task.id} className="flex flex-col p-4">
                  <div className="flex items-center gap-1.5">
                    <AppIcon app={app} size="sm" />
                    <ArrowRight className="size-3 text-faint" />
                    <span className="grid size-6 place-items-center rounded-lg bg-accent text-white"><Sparkles className="size-3" /></span>
                    <ArrowRight className="size-3 text-faint" />
                    <span className="grid size-6 place-items-center rounded-lg bg-human text-white"><UserCheck className="size-3" /></span>
                  </div>
                  <div className="mt-3 text-[13.5px] font-semibold tracking-tight">{l.task.name}</div>
                  <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-muted">
                    When {flow.trigger.event.toLowerCase()}, AI drafts it and you review. {l.task.hoursPerWeek} h/wk today.
                  </p>
                  <Button size="sm" className="mt-3 self-start" onClick={() => onBuild(l.task.id)}>Use this</Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-[11.5px] text-faint">Google Calendar uses a real read-only connection when it is set up on the server. Other apps are demo connections that shape your helpers; nothing is sent to them.</p>
    </div>
  );
}

function FlowChain({ apps, helper }: { apps: AppDef[]; helper: PersonalHelper }) {
  const flow = helper.config.flow;
  if (!flow) return <div className="mt-1 text-[12px] text-muted">{helper.config.goal}</div>;
  const trigger = findApp(apps, flow.trigger.app);
  const action = findApp(apps, flow.action.app);
  const step = "inline-flex items-center gap-1.5 rounded-md bg-sunken px-1.5 py-1 text-[11.5px] text-ink-2";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className={step}><AppIcon app={trigger} size="sm" />{flow.trigger.event}</span>
      <ArrowRight className="size-3 text-faint" />
      <span className={step}><Sparkles className="size-3.5 text-accent" />AI drafts</span>
      <ArrowRight className="size-3 text-faint" />
      <span className={step}><UserCheck className="size-3.5 text-human" />You review</span>
      <ArrowRight className="size-3 text-faint" />
      <span className={step}><AppIcon app={action} size="sm" />{flow.action.action}</span>
    </div>
  );
}

function ProgressView({ helpers, progress }: { helpers: PersonalHelper[]; progress: ReturnType<typeof progressFor> }) {
  const runs = helpers.flatMap((helper) => helper.runs.map((run) => ({ helper, run }))).reverse();
  return (
    <div className="space-y-6">
      <Card className="grid grid-cols-3 divide-x divide-line">
        {[
          { label: "Runs", value: progress.runs },
          { label: "Marked useful", value: progress.useful },
          { label: "Minutes saved", value: progress.minutes },
        ].map((s) => (
          <div key={s.label} className="px-6 py-4">
            <div className="text-[12.5px] text-muted">{s.label}</div>
            <div className="mt-1 text-[24px] leading-none font-semibold tracking-tight tabular-nums">{s.value}</div>
          </div>
        ))}
      </Card>
      {!runs.length ? (
        <Empty icon={<Check />} title="No runs yet">Run a helper on real work, then come back and say whether it helped.</Empty>
      ) : (
        <div className="space-y-2">{runs.map(({ helper, run }) => <RunReview key={run.id} helper={helper} run={run} />)}</div>
      )}
    </div>
  );
}

function RunReview({ helper, run }: { helper: PersonalHelper; run: HelperRun }) {
  const review = useStore((state) => state.reviewHelperRun);
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{run.meetingTitle}</div>
          <div className="text-[12px] text-muted">{helper.config.name} · {new Date(run.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant={run.feedback === "useful" ? "accent" : "secondary"} aria-pressed={run.feedback === "useful"} onClick={() => review(helper.id, run.id, { feedback: "useful" })}>Useful</Button>
          <Button size="sm" variant={run.feedback === "needs-work" ? "accent" : "secondary"} aria-pressed={run.feedback === "needs-work"} onClick={() => review(helper.id, run.id, { feedback: "needs-work" })}>Needs work</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "View"}</Button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <Result run={run} config={helper.config} />
          <Field label="Minutes this saved you (optional)">
            <Input
              aria-label={`Minutes saved for ${run.meetingTitle}`}
              type="number"
              min={0}
              max={1440}
              className="max-w-40"
              value={run.minutesSaved ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (event.target.value === "" || (Number.isFinite(value) && value >= 0 && value <= 1440)) review(helper.id, run.id, { minutesSaved: event.target.value === "" ? undefined : value });
              }}
            />
          </Field>
        </div>
      )}
    </Card>
  );
}
