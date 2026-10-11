"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Copy, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Interview, Workspace } from "@/lib/types";
import type { CalendarStatus, HelperConfig, HelperDraft, HelperRun, Meeting } from "@/lib/personal/types";
import { briefMarkdown, inputFingerprint, sampleMeeting, validateConfig } from "@/lib/personal/meeting";
import { briefSchema } from "@/lib/personal/schema";
import { Badge, Button, Card, Field, Input, Textarea } from "../ui";

const steps = ["Your task", "A good result", "Your context", "Test & improve", "Save & use"];
const selectStyle = "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] outline-accent";

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export function MeetingBuilder({ employee, workspace, draft, calendarResult = "", onClose, onSaved }: { employee: Interview; workspace: Workspace; draft: HelperDraft; calendarResult?: string; onClose: () => void; onSaved: () => void }) {
  const saveDraft = useStore((s) => s.saveHelperDraft);
  const saveHelper = useStore((s) => s.savePersonalHelper);
  const helpers = useStore((s) => s.personalHelpers);
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [error, setError] = useState(calendarResult === "failed" ? "Google connection wasn’t completed. Your draft is saved. Try connecting again." : "");
  const [busy, setBusy] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [events, setEvents] = useState<Meeting[] | null>(null);
  const [setup, setSetup] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  const { config, step } = draft;
  const fingerprint = inputFingerprint(config, employee, workspace);
  const tested = Boolean(draft.lastRun && draft.testedFingerprint === fingerprint);
  const task = employee.tasks.find((t) => t.id === config.taskId);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    requestJson(`/api/integrations/google/status?employee=${encodeURIComponent(employee.id)}`, { signal: controller.signal }).then(setStatus).catch((e) => { if (!controller.signal.aborted) setStatusError(e.message); });
    if (new URLSearchParams(window.location.search).has("calendar")) window.history.replaceState(null, "", `/my-work?employee=${encodeURIComponent(employee.id)}`);
    return () => { active.current = false; controller.abort(); };
  }, [employee.id]);
  function update(next: Partial<HelperDraft>) { saveDraft(employee.id, { ...draft, ...next }); }
  function edit(next: Partial<HelperConfig>) { update({ config: { ...config, ...next }, testedFingerprint: undefined }); setError(""); }
  function go(next: number) {
    if (next > step) { const issue = validateConfig(config, step); if (issue) { setError(issue); return; } }
    setError(""); update({ step: next });
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function loadEvents() {
    setCalendarBusy(true); setError("");
    try { const data = await requestJson(`/api/integrations/google/events?employee=${encodeURIComponent(employee.id)}`); if (active.current) setEvents(data.events); }
    catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Calendar unavailable."); }
    finally { if (active.current) setCalendarBusy(false); }
  }
  async function connect() {
    setCalendarBusy(true); setError("");
    try {
      const data = await requestJson("/api/integrations/google/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interviewId: employee.id }) });
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed."); setCalendarBusy(false); }
  }
  async function disconnect() {
    setCalendarBusy(true); setError("");
    try { await requestJson("/api/integrations/google/disconnect", { method: "POST" }); setStatus(status ? { ...status, connected: false } : null); setEvents(null); edit({ source: "sample", meeting: sampleMeeting(task?.name) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Disconnect failed."); }
    finally { setCalendarBusy(false); }
  }
  async function test() {
    const issue = validateConfig(config, 3);
    if (issue) { setError(issue); return; }
    setBusy(true); setError("");
    try {
      const data = await requestJson("/api/helpers/meeting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config, interview: employee }) });
      const brief = briefSchema.parse(data.brief);
      if (data.mode !== "ai" && data.mode !== "template") throw new Error("Unexpected result. Please run the test again.");
      const run: HelperRun = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), meetingTitle: config.meeting.title, source: config.meeting.source, mode: data.mode, brief };
      if (active.current) update({ lastRun: run, testedFingerprint: fingerprint });
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "The test couldn’t finish. Try again."); }
    finally { if (active.current) setBusy(false); }
  }
  function save() {
    const issue = validateConfig(config, 4);
    if (issue || !tested || !draft.lastRun) { setError(issue || "Test your current setup before saving."); return; }
    const existing = helpers.find((h) => h.id === draft.helperId && h.interviewId === employee.id);
    const now = new Date().toISOString();
    const runs = existing?.runs ?? [];
    saveHelper({ id: existing?.id ?? crypto.randomUUID(), interviewId: employee.id, kind: "skill", config, createdAt: existing?.createdAt ?? now, updatedAt: now, runs: runs.some((r) => r.id === draft.lastRun!.id) ? runs : [...runs, draft.lastRun] });
    saveDraft(employee.id, null);
    toast.success("Your personal helper is ready", { description: "Find it in My helpers. Run it whenever you need it." });
    onSaved();
  }
  function source(value: Meeting["source"]) {
    edit({ source: value, meeting: value === "sample" ? sampleMeeting(task?.name) : { id: value === "manual" ? "manual" : "", title: "", start: "", attendees: [], description: "", source: value } });
  }
  return <div className="enter space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" disabled={busy} icon={<ArrowLeft size={15} />} onClick={onClose}>Back to my work</Button><span className="text-xs text-muted">Draft saved in this browser · {employee.name}</span></div>
    <div><div className="mb-2 flex gap-2"><Badge tone="skill">Build a personal helper</Badge><Badge>You stay in control</Badge></div><h2 className="font-display text-3xl">Build my AI helper</h2><p className="mt-2 text-sm text-muted">One useful workflow, grounded in your interview and company context.</p></div>
    <ol className="grid grid-cols-5 gap-1 rounded-xl border border-line bg-surface p-2">{steps.map((label, i) => <li key={label}><button disabled={busy || i > step} onClick={() => go(i)} aria-current={step === i ? "step" : undefined} className={`flex w-full flex-col items-center gap-2 rounded-lg px-1 py-3 text-center text-xs sm:flex-row sm:justify-center ${step === i ? "bg-accent-soft font-medium text-accent" : "text-muted"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${i < step ? "bg-good-soft text-good" : step === i ? "bg-accent text-white" : "bg-sunken"}`}>{i < step ? <Check size={12} /> : i + 1}</span><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{["Task", "Result", "Context", "Test", "Save"][i]}</span></button></li>)}</ol>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="min-w-0 p-5 sm:p-7">
        <p className="mb-2 text-xs font-medium text-accent">STEP {step + 1} OF 5</p>
        <h3 tabIndex={-1} ref={heading} className="font-display text-2xl outline-none">{["Start with work you know.", "Teach it what good looks like.", "Give it the right context.", "Try it. Make it yours.", "Your skill, ready when you are."][step]}</h3>
        <fieldset disabled={busy} className="mt-5 min-w-0 space-y-5 disabled:opacity-70">
          {step === 0 && <>
            <p className="text-sm leading-6 text-muted">We suggested a task from your personal roadmap. Choose the work this helper will support, then describe the outcome you want.</p>
            <Field label="Task from your interview"><select className={selectStyle} value={config.taskId} onChange={(e) => { const next = employee.tasks.find((t) => t.id === e.target.value); edit({ taskId: e.target.value, goal: next ? `Help me complete ${next.name.toLowerCase()} faster and more consistently.` : config.goal, meeting: config.source === "sample" ? sampleMeeting(next?.name) : config.meeting }); }}>{employee.tasks.length ? employee.tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>) : <option value="">Recurring work</option>}</select></Field>
            {task && <blockquote className="border-l-2 border-accent pl-4 text-sm leading-6 text-muted"><p>{task.pain || task.name}</p><footer className="mt-1 text-xs text-faint">From your interview · {task.hoursPerWeek} hours/week on this task</footer></blockquote>}
            <Field label="What would you like help with?"><Textarea maxLength={2000} value={config.goal} onChange={(e) => edit({ goal: e.target.value })} /></Field>
          </>}
          {step === 1 && <>
            <p className="text-sm leading-6 text-muted">A skill is a reusable set of instructions. Describe how you want the helper to work, just as you would brief a colleague.</p>
            <Field label="What should be in your work brief?" group><div className="space-y-2">{([ ["agenda", "Suggested approach"], ["questions", "Questions to resolve"], ["checklist", "Review checklist"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm"><input type="checkbox" className="accent-accent" checked={config.sections.includes(key)} onChange={(e) => edit({ sections: e.target.checked ? [...config.sections, key] : config.sections.filter((s) => s !== key) })} />{label}</label>)}</div></Field>
            <Field label="Your instructions"><Textarea maxLength={4000} className="min-h-32" value={config.instructions} onChange={(e) => edit({ instructions: e.target.value })} /></Field>
            <p className="rounded-lg bg-paper p-3 text-xs leading-5 text-muted">Try: “Keep it to five bullets. Ask about open decisions. Don’t make commitments for me.” You can change this after testing.</p>
          </>}
          {step === 2 && <>
            <p className="text-sm leading-6 text-muted">Use a practice context, enter a work item, or choose an upcoming Calendar event.</p>
            <Field label="Context source" group><div className="grid gap-2 sm:grid-cols-3">{([ ["sample", "Practice context"], ["manual", "Enter work context"], ["google", "Google Calendar"] ] as const).map(([key, title]) => <Button key={key} variant={config.source === key ? "accent" : "secondary"} aria-pressed={config.source === key} onClick={() => source(key)}>{title}</Button>)}</div></Field>
            {config.source === "sample" && <div className="rounded-xl bg-warn-soft p-4"><Badge tone="warn">Practice context</Badge><p className="mt-2 text-sm font-medium">{config.meeting.title}</p><p className="mt-1 text-sm leading-6 text-muted">{config.meeting.description}</p></div>}
            {config.source === "manual" && <div className="space-y-4"><Field label="Work item or request"><Input maxLength={500} value={config.meeting.title} placeholder="e.g. Prepare the weekly KPI report" onChange={(e) => edit({ meeting: { ...config.meeting, title: e.target.value } })} /></Field><Field label="People involved (optional)" hint="Separate with commas"><Input maxLength={2000} value={config.meeting.attendees.join(",")} onChange={(e) => edit({ meeting: { ...config.meeting, attendees: e.target.value ? e.target.value.split(",") : [] } })} /></Field><Field label="Context and desired result"><Textarea maxLength={10000} value={config.meeting.description} onChange={(e) => edit({ meeting: { ...config.meeting, description: e.target.value } })} /></Field></div>}
            {config.source === "google" && <div className="space-y-4 rounded-xl border border-line p-4"><div className="flex items-center gap-2 text-sm font-medium"><CalendarDays size={16} />Google Calendar <Badge tone={status?.connected ? "good" : "neutral"}>{status?.connected ? "Connected" : status?.configured ? "Not connected" : "Setup needed"}</Badge></div><p className="text-xs leading-5 text-muted">Read-only access to events. Choose one meeting to include in your brief. No invitations or calendar changes.</p>{statusError && <p role="alert" className="text-xs text-bad">{statusError}</p>}{status?.connected ? <><div className="flex flex-wrap gap-2"><Button loading={calendarBusy} onClick={loadEvents}>Load upcoming meetings</Button><Button variant="ghost" disabled={calendarBusy} onClick={disconnect}>Disconnect</Button></div>{events && (events.length ? <Field label="Upcoming meetings · first 50 in the next 14 days"><select className={selectStyle} value={config.meeting.id} onChange={(e) => { const meeting = events.find((m) => m.id === e.target.value); if (meeting) edit({ meeting }); }}><option value="">Choose a meeting</option>{events.map((event) => <option key={event.id} value={event.id}>{event.start ? `${new Date(event.start).toLocaleDateString()} · ` : ""}{event.title}</option>)}</select></Field> : <p className="text-sm text-muted">No upcoming events found. Enter meeting details yourself to continue.</p>)}</> : status?.configured ? <Button loading={calendarBusy} variant="accent" onClick={connect}>Connect Google Calendar</Button> : <><p className="text-sm text-muted">Your developer needs to configure Google OAuth once. You can use the practice context or enter details in the meantime.</p><Button onClick={() => setSetup(!setup)}>{setup ? "Hide setup instructions" : "Show setup instructions"}</Button>{setup && <div className="space-y-2 break-words text-xs leading-6 text-muted"><p>1. In Google Cloud, enable the Calendar API and configure an OAuth consent screen with your test account.</p><p>2. Create a Web application OAuth client. Add this authorized redirect URI:</p><code className="block break-all rounded bg-paper p-2">{status?.redirectUri || "http://localhost:3000/api/integrations/google/callback"}</code><p>3. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local. Restart the development server.</p><p>Full instructions: <code>docs/PERSONAL-WORKSPACE.md</code>. Keep credentials on the server.</p></div>}</>}{config.meeting.title && <p className="text-sm font-medium">Selected: {config.meeting.title}</p>}</div>}
            <Field label="Company context" hint="Confirm or add context"><Textarea maxLength={4000} value={config.companyContext} onChange={(e) => edit({ companyContext: e.target.value })} /></Field>
            <Field label="Background notes (optional)" hint="Only what this task needs"><Textarea maxLength={12000} placeholder="Relevant project notes, known open questions, or a previous example…" value={config.notes} onChange={(e) => edit({ notes: e.target.value })} /></Field>
            <p className="text-xs leading-5 text-muted">Selected context, notes, and outputs are saved in this browser with your helper. Use context you’re allowed to share.</p>
          </>}
          {step === 3 && <>
            <p className="text-sm leading-6 text-muted">Run a test and review the result. Does it help you prepare? Go back to adjust your instructions or add missing context.</p>
            <div className="rounded-xl bg-paper p-4"><Badge tone={status?.aiConfigured ? "accent" : "warn"}>{status ? status.aiConfigured ? "AI provider configured" : "Local mode" : "Checking provider…"}</Badge><p className="mt-2 text-xs leading-6 text-muted">{status?.aiConfigured ? "Running sends your structured interview answers, selected work context, instructions, and notes to the configured OpenAI API provider. Review the draft before using it." : "Without an API key, this creates a useful local work brief from the employee’s structured context. Add a provider later for richer drafting."}</p>{statusError && <p role="alert" className="text-xs text-bad">{statusError} Reload this page to retry.</p>}</div>
            <Button variant="accent" disabled={!status} loading={busy} icon={<Play size={14} />} onClick={test}>{draft.lastRun ? "Run again" : status?.aiConfigured ? "Generate my brief" : "Try the template"}</Button>
            {draft.lastRun && <BriefPreview run={draft.lastRun} config={config} stale={!tested} />}
            <details className="rounded-lg border border-line p-3 text-xs leading-6"><summary className="cursor-pointer font-medium">Review the context included in this run</summary><div className="mt-3 space-y-3 whitespace-pre-wrap break-words"><p><strong>Employee:</strong> {employee.name} · {employee.role} · {employee.team}</p><p><strong>Interview context:</strong> {employee.context || "Not supplied"}</p><p><strong>Tasks and friction:</strong> {employee.tasks.map((t) => `${t.name}: ${t.pain || "No friction supplied"}. Tools: ${t.tools.join(", ") || "None supplied"}`).join("\n")}</p><p><strong>Current AI use:</strong> {employee.aiToday || "Not supplied"}</p><p><strong>Dependencies:</strong> {employee.waits || "Not supplied"}</p><p><strong>Human judgment:</strong> {employee.keepHuman || "Review all decisions yourself"}</p><p><strong>Company:</strong> {config.companyContext}</p><p><strong>Work context ({config.source}):</strong> {config.meeting.title} · {config.meeting.start || "No date supplied"}</p><p><strong>People involved:</strong> {config.meeting.attendees.join(", ") || "Not supplied"}</p><p>{config.meeting.description || "No description supplied"}</p><p><strong>Background notes:</strong> {config.notes || "Not supplied"}</p></div></details>
          </>}
          {step === 4 && <>
            <div className="flex gap-3 rounded-xl bg-accent-soft p-4"><BookOpen className="shrink-0 text-accent" size={22} /><div><p className="text-sm font-medium">A reusable personal AI skill</p><p className="mt-1 text-xs leading-6 text-muted">Your instructions, interview evidence, company context, and approved source are saved together. Open it from My helpers and run it when you need it.</p></div></div>
            <Field label="Name your skill"><Input maxLength={120} value={config.name} onChange={(e) => { /* Renaming changes the recipe, not its generated content. */ const next = { ...config, name: e.target.value }; update({ config: next, testedFingerprint: tested ? inputFingerprint(next, employee, workspace) : undefined }); }} /></Field>
            <div className="space-y-2 text-sm text-muted"><p><strong className="text-ink">Runs:</strong> When you choose</p><p><strong className="text-ink">Produces:</strong> A brief for you to review</p><p><strong className="text-ink">Keeps with you:</strong> {employee.keepHuman || "Decisions and commitments"}</p></div>
            <p className="text-xs leading-6 text-muted">This version does not schedule runs or send external actions. After trying the skill, record what helped in Progress. A future automation can run the same approved recipe on a trigger.</p>
            {!tested && <p className="text-sm text-warn">Your context has changed. Return to step 4 and test the updated setup.</p>}
          </>}
        </fieldset>
        {error && <p role="alert" className="mt-4 rounded-lg bg-bad-soft p-3 text-sm text-bad">{error}</p>}
        <div className="mt-7 flex items-center justify-between border-t border-line pt-5"><Button variant="ghost" disabled={step === 0 || busy} onClick={() => go(step - 1)} icon={<ArrowLeft size={14} />}>Back</Button>{step < 4 ? <Button variant="accent" disabled={busy || (step === 3 && !tested)} onClick={() => go(step + 1)} icon={<ArrowRight size={14} />}>{step === 3 ? "Use this result" : "Continue"}</Button> : <Button variant="accent" disabled={!tested} onClick={save} icon={<Check size={15} />}>Save my skill</Button>}</div>
      </Card>
      <aside className="space-y-4 lg:sticky lg:top-6"><Card className="p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-accent" />Your recipe</div><dl className="mt-5 space-y-4 text-xs leading-5"><div><dt className="text-faint">GOAL</dt><dd className="mt-1 text-sm">{config.goal || "Add your goal"}</dd></div><div><dt className="text-faint">OUTPUT</dt><dd className="mt-1 capitalize">{config.sections.map((section) => section === "agenda" ? "approach" : section).join(" · ") || "Choose your sections"}</dd></div><div><dt className="text-faint">CONTEXT</dt><dd className="mt-1">Your interview + company context + {config.source === "sample" ? "practice work item" : config.source === "manual" ? "your work details" : "selected calendar event"}</dd></div><div><dt className="text-faint">YOU OWN</dt><dd className="mt-1">{employee.keepHuman || "Judgment and final decisions"}</dd></div></dl></Card><p className="px-2 text-xs leading-6 text-muted">Start small. A helpful first version is one you can understand, review, and improve.</p></aside>
    </div>
  </div>;
}

function BriefPreview({ run, config, stale }: { run: HelperRun; config: HelperConfig; stale: boolean }) {
  async function copy() {
    try { await navigator.clipboard.writeText(briefMarkdown(config, run)); toast.success("Brief copied"); }
    catch { toast.error("Clipboard unavailable. Select the brief text to copy it."); }
  }
  return <div className={`rounded-xl border p-5 ${stale ? "border-warn" : "border-line"}`}><div className="flex flex-wrap items-center justify-between gap-2"><Badge tone={run.mode === "ai" ? "accent" : "warn"}>{run.mode === "ai" ? "AI draft · review before use" : "Template worksheet · local fallback"}</Badge><Button size="sm" variant="ghost" disabled={stale} icon={<Copy size={13} />} onClick={copy}>Copy output</Button></div>{stale && <p className="mt-3 text-sm text-warn">Your setup changed. Run again to refresh this result.</p>}<p className="mt-4 text-sm leading-6">{run.brief.summary}</p>{([ ["Suggested approach", run.brief.agenda], ["Questions to resolve", run.brief.questions], ["Review checklist", run.brief.checklist], ["Unknowns to resolve", run.brief.unknowns] ] as const).map(([title, items]) => items.length ? <div key={title} className="mt-5"><h4 className="text-sm font-semibold">{title}</h4><ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-muted">{items.map((line, i) => <li key={i}>{line}</li>)}</ul></div> : null)}</div>;
}
