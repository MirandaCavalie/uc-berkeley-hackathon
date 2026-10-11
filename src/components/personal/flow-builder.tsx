"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Copy, Lightbulb, Lock, Play, Sparkles, UserCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Interview, Workspace } from "@/lib/types";
import type { CalendarStatus, FlowConfig, HelperConfig, HelperDraft, HelperRun, Meeting } from "@/lib/personal/types";
import { briefMarkdown, inputFingerprint, validateConfig } from "@/lib/personal/meeting";
import { briefSchema } from "@/lib/personal/schema";
import { CALENDAR_APP, MANUAL_APP, SCHEDULE_APP, builtInApps, findApp, type AppDef, type Lesson } from "@/lib/personal/coach";
import { Badge, Button, Card, Field, Input, Textarea } from "../ui";

export const selectStyle = "w-full rounded-lg bg-surface px-3 py-2 text-[13px] shadow-[0_0_0_1px_var(--color-line-strong)] outline-accent";

export async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export function useGoogleStatus(employeeId: string) {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    requestJson(`/api/integrations/google/status?employee=${encodeURIComponent(employeeId)}`, { signal: controller.signal })
      .then(setStatus)
      .catch(() => !controller.signal.aborted && setStatus({ configured: false, connected: false, aiConfigured: false, redirectUri: "" }));
    return () => controller.abort();
  }, [employeeId]);
  return [status, setStatus] as const;
}

export function AppIcon({ app, size = "md" }: { app?: Pick<AppDef, "id" | "name" | "color">; size?: "sm" | "md" }) {
  const Icon = app?.id === MANUAL_APP ? Play : app?.id === SCHEDULE_APP ? Zap : null;
  return (
    <span
      className={clsx("grid shrink-0 place-items-center rounded-lg font-semibold text-white", size === "sm" ? "size-6 text-[10.5px]" : "size-9 text-[13px]")}
      style={{ background: app?.color ?? "var(--color-faint)" }}
    >
      {Icon ? <Icon className={size === "sm" ? "size-3" : "size-4"} /> : (app?.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const nodes = ["When", "AI does", "You check", "Then"] as const;
const outputs = [
  ["agenda", "A draft to start from"],
  ["questions", "Questions to ask"],
  ["checklist", "What to check before using it"],
] as const;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const goalFor = (task: string) => `Help me with ${lowerFirst(task)}.`;

export function flowFor(lesson: Lesson | undefined, apps: AppDef[], connected: string[], keepHuman: string): FlowConfig {
  const taskApps = apps.filter((a) => lesson?.task.tools.some((t) => t.toLowerCase() === a.name.toLowerCase()));
  const source = taskApps.find((a) => connected.includes(a.id)) ?? taskApps[0];
  const target = taskApps.length > 1 ? taskApps.find((a) => a !== source && connected.includes(a.id)) ?? taskApps.find((a) => a !== source) : source;
  return {
    trigger: source ? { app: source.id, event: source.triggers[0] } : { app: MANUAL_APP, event: builtInApps[0].triggers[0] },
    action: target ? { app: target.id, action: target.actions[0] } : { app: MANUAL_APP, action: builtInApps[0].actions[0] },
    checkpoint: lesson?.youKeep || keepHuman || "I read every result before anything is used or sent.",
  };
}

export function FlowBuilder({
  employee,
  workspace,
  draft,
  apps,
  connected,
  lessons,
  onClose,
  onSaved,
}: {
  employee: Interview;
  workspace: Workspace;
  draft: HelperDraft;
  apps: AppDef[];
  connected: string[];
  lessons: Lesson[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveDraft = useStore((s) => s.saveHelperDraft);
  const saveHelper = useStore((s) => s.savePersonalHelper);
  const helpers = useStore((s) => s.personalHelpers);
  const [status] = useGoogleStatus(employee.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Meeting[] | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => void (active.current = false);
  }, []);

  const { config } = draft;
  const flow = config.flow ?? flowFor(lessons.find((l) => l.task.id === config.taskId), apps, connected, employee.keepHuman);
  const node = Math.min(draft.step, 3);
  const lesson = lessons.find((l) => l.task.id === config.taskId);
  const fingerprint = inputFingerprint({ ...config, flow }, employee, workspace);
  const tested = Boolean(draft.lastRun && draft.testedFingerprint === fingerprint);
  const usable = [...builtInApps, ...apps.filter((a) => connected.includes(a.id))];
  const trigger = findApp(apps, flow.trigger.app);
  const action = findApp(apps, flow.action.app);

  function update(next: Partial<HelperDraft>) {
    saveDraft(employee.id, { ...draft, config: { ...config, flow }, ...next });
  }
  function edit(next: Partial<HelperConfig>) {
    update({ config: { ...config, flow, ...next }, testedFingerprint: undefined });
    setError("");
  }
  const editFlow = (next: Partial<FlowConfig>) => edit({ flow: { ...flow, ...next } });

  async function loadEvents() {
    setBusy(true);
    try {
      const data = await requestJson(`/api/integrations/google/events?employee=${encodeURIComponent(employee.id)}`);
      if (active.current) setEvents(data.events);
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "Calendar unavailable.");
    } finally {
      if (active.current) setBusy(false);
    }
  }

  async function test() {
    const issue = validateConfig(config, 3);
    if (issue) return setError(issue);
    setBusy(true);
    setError("");
    try {
      const data = await requestJson("/api/helpers/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, interview: employee }),
      });
      const brief = briefSchema.parse(data.brief);
      const run: HelperRun = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), meetingTitle: config.meeting.title, source: config.meeting.source, mode: data.mode, brief };
      if (active.current) update({ lastRun: run, testedFingerprint: fingerprint });
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "The test couldn't finish. Try again.");
    } finally {
      if (active.current) setBusy(false);
    }
  }

  function save() {
    const issue = validateConfig(config, 4);
    if (issue || !tested || !draft.lastRun) return setError(issue || "Run a test on the current setup before saving.");
    const existing = helpers.find((h) => h.id === draft.helperId && h.interviewId === employee.id);
    const now = new Date().toISOString();
    const runs = existing?.runs ?? [];
    saveHelper({
      id: existing?.id ?? crypto.randomUUID(),
      interviewId: employee.id,
      kind: "skill",
      config: { ...config, flow },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      runs: runs.some((r) => r.id === draft.lastRun!.id) ? runs : [...runs, draft.lastRun],
    });
    saveDraft(employee.id, null);
    toast.success("Helper saved", { description: "Find it in My helpers and run it whenever you need it." });
    onSaved();
  }

  return (
    <div className="enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={busy} icon={<ArrowLeft className="size-4" />} onClick={onClose}>
          Back to my helpers
        </Button>
        <div className="flex items-center gap-2">
          <Input aria-label="Helper name" maxLength={120} className="h-9 w-64" value={config.name} onChange={(e) => edit({ name: e.target.value })} />
          <Button variant="accent" disabled={!tested || busy} onClick={save} icon={<Check className="size-4" />}>
            Save helper
          </Button>
        </div>
      </div>

      <div
        className="rounded-xl p-6 shadow-[inset_0_0_0_1px_var(--color-line)]"
        style={{ backgroundImage: "radial-gradient(var(--color-line-strong) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        <ol className="grid gap-3 md:grid-cols-4 md:gap-8">
          <FlowNode index={0} active={node === 0} done={!!trigger} onClick={() => update({ step: 0 })} icon={<AppIcon app={trigger} />} title={trigger?.name ?? "Pick an app"} detail={flow.trigger.event} />
          <FlowNode index={1} active={node === 1} done={!!config.instructions.trim()} onClick={() => update({ step: 1 })} icon={<NodeIcon className="bg-accent"><Sparkles className="size-4" /></NodeIcon>} title="AI drafts" detail={config.goal || "Describe the goal"} />
          <FlowNode index={2} active={node === 2} done={tested} onClick={() => update({ step: 2 })} icon={<NodeIcon className="bg-human"><UserCheck className="size-4" /></NodeIcon>} title="You review" detail={tested ? "Tested" : "Run a test"} />
          <FlowNode index={3} active={node === 3} done={!!action} last onClick={() => update({ step: 3 })} icon={<AppIcon app={action} />} title={action?.name ?? "Pick an app"} detail={flow.action.action} />
        </ol>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="min-w-0 p-6">
          <div className="mb-1 text-[12px] font-medium text-muted">Step {node + 1} · {nodes[node]}</div>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {node === 0 && (
              <>
                <h3 className="text-[17px] font-semibold tracking-tight">What starts this helper?</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="App">
                    <select className={selectStyle} value={flow.trigger.app} onChange={(e) => { const app = findApp(apps, e.target.value); editFlow({ trigger: { app: e.target.value, event: app?.triggers[0] ?? "" } }); }}>
                      {usable.filter((a) => a.triggers.length).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      {apps.filter((a) => !connected.includes(a.id)).map((a) => <option key={a.id} value={a.id} disabled>{a.name} (connect first)</option>)}
                    </select>
                  </Field>
                  <Field label="Event">
                    <select className={selectStyle} value={flow.trigger.event} onChange={(e) => editFlow({ trigger: { ...flow.trigger, event: e.target.value } })}>
                      {(trigger?.triggers ?? []).map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Which task from your interview is this for?">
                  <select className={selectStyle} value={config.taskId} onChange={(e) => { const task = employee.tasks.find((t) => t.id === e.target.value); edit({ taskId: e.target.value, goal: task ? goalFor(task.name) : config.goal }); }}>
                    {employee.tasks.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.hoursPerWeek} h/wk</option>)}
                  </select>
                </Field>
                <Coach>Start with something that happens often and looks the same each time. You still review every result, so nothing goes out without you.</Coach>
              </>
            )}

            {node === 1 && (
              <>
                <h3 className="text-[17px] font-semibold tracking-tight">What should AI do?</h3>
                <Field label="Goal">
                  <Input maxLength={2000} value={config.goal} onChange={(e) => edit({ goal: e.target.value })} />
                </Field>
                <Field label="Instructions, like you'd brief a colleague">
                  <Textarea maxLength={4000} className="min-h-32" value={config.instructions} onChange={(e) => edit({ instructions: e.target.value })} />
                </Field>
                <Field label="Give me back" group>
                  <div className="flex flex-wrap gap-2">
                    {outputs.map(([key, label]) => {
                      const on = config.sections.includes(key);
                      return (
                        <button key={key} type="button" aria-pressed={on} onClick={() => edit({ sections: on ? config.sections.filter((s) => s !== key) : [...config.sections, key] })} className={clsx("pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]", on ? "bg-accent-soft font-medium text-accent" : "bg-sunken text-muted")}>
                          {on && <Check className="size-3.5" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="flex flex-wrap gap-2 text-[12px] text-muted">
                  Always included: <Badge>Your interview</Badge>
                  <Badge>{workspace.company} context</Badge>
                </div>
                {lesson && <Coach>{lesson.tip}</Coach>}
              </>
            )}

            {node === 2 && (
              <>
                <h3 className="text-[17px] font-semibold tracking-tight">Try it on a real example</h3>
                <Field label="You always decide">
                  <div className="relative">
                    <Textarea maxLength={2000} className="min-h-16 pr-24" value={flow.checkpoint} onChange={(e) => editFlow({ checkpoint: e.target.value })} />
                    <span className="absolute top-2.5 right-3 inline-flex items-center gap-1 text-[11.5px] text-human"><Lock className="size-3" /> Always on</span>
                  </div>
                </Field>
                {flow.trigger.app === CALENDAR_APP && status?.connected && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" loading={busy} onClick={loadEvents}>Use one of my meetings</Button>
                    {events && (
                      <select className={clsx(selectStyle, "w-auto")} value={config.meeting.source === "google" ? config.meeting.id : ""} onChange={(e) => { const meeting = events.find((m) => m.id === e.target.value); if (meeting) edit({ source: "google", meeting }); }}>
                        <option value="">Choose a meeting</option>
                        {events.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                    )}
                  </div>
                )}
                <Field label="Example title">
                  <Input maxLength={500} value={config.meeting.title} placeholder="e.g. Vendor asking when invoice 4471 gets paid" onChange={(e) => edit({ source: "manual", meeting: { ...config.meeting, id: "manual", source: "manual", title: e.target.value } })} />
                </Field>
                <Field label="Paste the example">
                  <Textarea maxLength={10000} className="min-h-28" placeholder="Paste an email, ticket, or notes you got this week…" value={config.meeting.description} onChange={(e) => edit({ source: "manual", meeting: { ...config.meeting, id: "manual", source: "manual", description: e.target.value } })} />
                </Field>
                <Button variant="accent" loading={busy} disabled={!status} icon={<Play className="size-3.5" />} onClick={test}>
                  {draft.lastRun ? "Run again" : "Run a test"}
                </Button>
                {draft.lastRun && <Result run={draft.lastRun} config={config} stale={!tested} />}
                <Coach>Read the result like you&apos;d read a new teammate&apos;s work. If something is off, fix the instructions in step 2 and run it again. That loop is how you get good at AI.</Coach>
              </>
            )}

            {node === 3 && (
              <>
                <h3 className="text-[17px] font-semibold tracking-tight">Where should the approved result go?</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="App">
                    <select className={selectStyle} value={flow.action.app} onChange={(e) => { const app = findApp(apps, e.target.value); editFlow({ action: { app: e.target.value, action: app?.actions[0] ?? "" } }); }}>
                      {usable.filter((a) => a.actions.length).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      {apps.filter((a) => !connected.includes(a.id)).map((a) => <option key={a.id} value={a.id} disabled>{a.name} (connect first)</option>)}
                    </select>
                  </Field>
                  <Field label="Action">
                    <select className={selectStyle} value={flow.action.action} onChange={(e) => editFlow({ action: { ...flow.action, action: e.target.value } })}>
                      {(action?.actions ?? []).map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </Field>
                </div>
                <Coach>Results are always saved as drafts. You send them yourself after your review, so you stay the one accountable for the work.</Coach>
              </>
            )}
          </fieldset>
          {error && <p role="alert" className="mt-4 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">{error}</p>}
          <div className="mt-6 flex justify-between border-t border-line pt-4">
            <Button variant="ghost" disabled={node === 0 || busy} onClick={() => update({ step: node - 1 })}>Back</Button>
            {node < 3 ? (
              <Button variant="accent" disabled={busy} onClick={() => update({ step: node + 1 })}>Next</Button>
            ) : (
              <Button variant="accent" disabled={!tested || busy} onClick={save} icon={<Check className="size-4" />}>{tested ? "Save helper" : "Test it first (step 3)"}</Button>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:sticky lg:top-6">
          <div className="text-[13px] font-semibold">How it runs</div>
          <ol className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-ink-2">
            <li><span className="text-muted">When </span>{lowerFirst(flow.trigger.event)} in {trigger?.name ?? "…"}</li>
            <li><span className="text-muted">AI </span>{lowerFirst(config.goal.replace(/\.$/, "")) || "…"}</li>
            <li><span className="text-muted">You </span>check it: {lowerFirst(flow.checkpoint.replace(/\.$/, ""))}</li>
            <li><span className="text-muted">Then </span>{lowerFirst(flow.action.action)}{action && action.id !== MANUAL_APP ? ` in ${action.name}` : ""}</li>
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
            {status?.aiConfigured ? "Tests use the configured AI provider." : "No AI key configured, so tests return a structured worksheet instead of an AI draft."}
          </p>
        </Card>
      </div>
    </div>
  );
}

function FlowNode({ index, active, done, last, onClick, icon, title, detail }: { index: number; active: boolean; done: boolean; last?: boolean; onClick: () => void; icon: ReactNode; title: string; detail: string }) {
  return (
    <li className="relative">
      {!last && <span className="absolute top-1/2 -right-8 hidden h-px w-8 bg-line-strong md:block" />}
      <button type="button" onClick={onClick} className={clsx("pressable flex w-full items-start gap-3 rounded-xl bg-surface p-3 text-left shadow-card", active && "ring-2 ring-accent")}>
        {icon}
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between text-[11px] font-medium text-muted">
            {nodes[index]}
            {done && <Check className="size-3.5 text-good" />}
          </span>
          <span className="block truncate text-[13px] font-semibold text-ink">{title}</span>
          <span className="block truncate text-[11.5px] text-muted">{detail}</span>
        </span>
      </button>
    </li>
  );
}

function NodeIcon({ className, children }: { className: string; children: ReactNode }) {
  return <span className={clsx("grid size-9 shrink-0 place-items-center rounded-lg text-white", className)}>{children}</span>;
}

function Coach({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-accent-soft/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-accent" />
      {children}
    </div>
  );
}

export function Result({ run, config, stale }: { run: HelperRun; config: HelperConfig; stale?: boolean }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(briefMarkdown(config, run));
      toast.success("Copied");
    } catch {
      toast.error("Clipboard unavailable. Select the text to copy it.");
    }
  }
  const sections = [
    ["A draft to start from", run.brief.agenda],
    ["Questions to ask", run.brief.questions],
    ["Check before using", run.brief.checklist],
    ["Missing information", run.brief.unknowns],
  ] as const;
  return (
    <div className={clsx("rounded-xl p-4 shadow-[inset_0_0_0_1px_var(--color-line)]", stale && "shadow-[inset_0_0_0_1px_var(--color-warn)]")}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={run.mode === "ai" ? "accent" : "warn"}>{run.mode === "ai" ? "AI draft" : "Worksheet"}</Badge>
        <Button size="sm" variant="ghost" disabled={stale} icon={<Copy className="size-3.5" />} onClick={copy}>Copy</Button>
      </div>
      {stale && <p className="mt-2 text-[12.5px] text-warn">You changed the setup. Run it again to refresh.</p>}
      <p className="mt-3 text-[13px] leading-relaxed">{run.brief.summary}</p>
      {sections.map(([title, items]) =>
        items.length ? (
          <div key={title} className="mt-3">
            <div className="text-[12px] font-medium text-muted">{title}</div>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-2">{items.map((line, i) => <li key={i}>{line}</li>)}</ul>
          </div>
        ) : null,
      )}
    </div>
  );
}
