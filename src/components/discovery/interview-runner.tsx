"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowUp, Check, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input } from "@/components/ui";
import { interviewTurn, judgeTasks } from "@/lib/client";
import { answer, effectiveProcess, promptFor, replay, type RunnerState } from "@/lib/engine/interview";
import { currentAgentNode, evidenceCoverage, INTERVIEW_AGENT, nodeMeta } from "@/lib/engine/interview-agent";
import { OTHER, processes } from "@/lib/engine/processes";
import { useStore } from "@/lib/store";
import type { Interview, InterviewTask } from "@/lib/types";
import { Logo } from "../brand";
import { Confidence } from "../shared";

export function InterviewRunner({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const company = useStore((s) => s.workspace.company);
  const saveInterview = useStore((s) => s.saveInterview);
  const readOnly = interview.status === "completed";
  const [state, setState] = useState<RunnerState>(() => (readOnly ? { step: "review", taskIndex: 0, interview } : replay(interview)));
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentMode, setAgentMode] = useState<"model" | "local">("local");
  const [scopeAccepted, setScopeAccepted] = useState(interview.consent?.status === "accepted");
  const bottom = useRef<HTMLDivElement>(null);
  const iv = state.interview;
  const prompt = promptFor(state, company);
  const answered = iv.transcript.filter((m) => m.from === "person").length;
  const expected = 6 + Math.max(iv.tasks.length, 3) * 2;
  const node = nodeMeta(currentAgentNode(state));
  const coverage = evidenceCoverage(iv);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [iv.transcript.length, state.step]);

  async function send() {
    const text = draft.trim();
    if (!text || agentThinking) return;
    setAgentThinking(true);
    setDraft("");
    const deterministicNext = answer(state, text);
    const decision = await interviewTurn({
      step: state.step,
      taskName: iv.tasks[state.taskIndex]?.name ?? null,
      currentTaskPain: iv.tasks[state.taskIndex]?.pain ?? "",
      answer: text,
      deterministicNextStep: deterministicNext.step,
      deterministicNextTask: deterministicNext.interview.tasks[deterministicNext.taskIndex]?.name ?? null,
    }).catch(() => null);
    const next =
      decision?.action === "probe" && state.step === "pain"
        ? { ...deterministicNext, step: "painProbe" as const }
        : decision?.action === "clarify" && state.step === "hours"
          ? { ...deterministicNext, step: "hoursProbe" as const }
          : deterministicNext;
    if (decision) setAgentMode(decision.mode);
    const transcript = [...iv.transcript, { from: "ai" as const, text: prompt }, { from: "person" as const, text }];
    const updated: Interview = { ...next.interview, transcript, status: "in-progress" };
    setState({ ...next, interview: updated });
    saveInterview(updated);
    setAgentThinking(false);
  }

  function editTask(id: string, patch: Partial<InterviewTask>) {
    setState({ ...state, interview: { ...iv, tasks: iv.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) } });
  }

  async function submit() {
    setSubmitting(true);
    const done: Interview = { ...iv, status: "completed", completedAt: new Date().toISOString() };
    const judged = (await judgeTasks([done]))?.[0] ?? done;
    saveInterview(judged);
    toast.success("Interview submitted", { description: `${done.tasks.length} tasks added to the work map.` });
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="pressable inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Discovery
        </button>
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="hidden rounded-md bg-accent-soft px-2 py-1 font-medium text-accent sm:inline-flex">
            {INTERVIEW_AGENT.name} · {node.label} · {agentMode === "model" ? "model route" : "guardrails"}
          </span>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out)]"
              style={{ width: `${state.step === "review" ? 100 : Math.min(95, (answered / expected) * 100)}%` }}
            />
          </div>
          {state.step === "review" ? `${coverage.captured}/${coverage.total} evidence captured` : `About ${Math.max(1, Math.round((expected - answered) * 0.6))} min left`}
        </div>
      </div>

      <div className="mb-5">
        <h1 className="font-display text-[24px] leading-tight">{iv.name}</h1>
        <div className="text-[13px] text-muted">
          {iv.role} · {iv.team}
        </div>
      </div>

      {!readOnly && !scopeAccepted ? (
        <ScopeGate
          onAccept={() => {
            const updated = { ...iv, consent: { status: "accepted" as const, acceptedAt: new Date().toISOString() } };
            setState({ ...state, interview: updated });
            saveInterview(updated);
            setScopeAccepted(true);
          }}
        />
      ) : (
        <>
          <div className="space-y-3">
            {iv.transcript.map((m, i) => (
              <Bubble key={i} from={m.from} text={m.text} />
            ))}
            {!readOnly && <Bubble from="ai" text={prompt} live />}
            <div ref={bottom} />
          </div>

          {state.step !== "review" ? (
        <div className="sticky bottom-4 mt-5">
          <Card className="flex items-end gap-2 p-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={state.step === "tasks" ? 4 : 2}
              placeholder={state.step === "tasks" ? "One task per line" : "Type your answer"}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-faint"
            />
            <Button variant="accent" onClick={send} loading={agentThinking} disabled={!draft.trim()} aria-label="Send" icon={<ArrowUp className="size-4" />} />
          </Card>
          <div className="mt-1.5 px-1 text-[11.5px] text-faint">Enter to send · Shift+Enter for a new line</div>
        </div>
          ) : (
        <Captured
          interview={iv}
          readOnly={readOnly}
          onEdit={editTask}
          onRemove={(id) => setState({ ...state, interview: { ...iv, tasks: iv.tasks.filter((t) => t.id !== id) } })}
        >
          {!readOnly && (
            <Button variant="accent" size="lg" loading={submitting} onClick={submit} icon={<Check className="size-4" />}>
              Submit interview
            </Button>
          )}
        </Captured>
          )}
        </>
      )}
    </div>
  );
}

function ScopeGate({ onAccept }: { onAccept: () => void }) {
  return (
    <Card className="mt-8 border border-accent/15 bg-accent-soft/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-white"><ShieldCheck className="size-4" /></span>
        <div>
          <h2 className="text-[15px] font-semibold">Before we start</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">This conversation captures how work happens: recurring tasks, time, tools, blockers, AI use, and what should stay human. Do not include passwords, customer data, health information, or other sensitive personal details.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">You can stop or correct the record before it is submitted to the company research team.</p>
          <Button className="mt-4" variant="accent" onClick={onAccept}>I understand — start interview</Button>
        </div>
      </div>
    </Card>
  );
}

function Bubble({ from, text, live }: { from: "ai" | "person"; text: string; live?: boolean }) {
  if (from === "person")
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-line text-white">{text}</div>
      </div>
    );
  return (
    <div className={clsx("flex items-start gap-2.5", live && "enter")}>
      <Logo size={28} className="mt-0.5" />
      <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface px-3.5 py-2 text-[14px] leading-relaxed text-ink shadow-card">{text}</div>
    </div>
  );
}

function Captured({
  interview,
  readOnly,
  onEdit,
  onRemove,
  children,
}: {
  interview: Interview;
  readOnly: boolean;
  onEdit: (id: string, patch: Partial<InterviewTask>) => void;
  onRemove: (id: string) => void;
  children?: React.ReactNode;
}) {
  const notes = [
    { label: "Waits on", text: interview.waits, tone: "bg-sunken/60", title: "text-muted" },
    { label: "AI today", text: interview.aiToday, tone: "bg-accent-soft/60", title: "text-accent" },
    { label: "Keep human", text: interview.keepHuman, tone: "bg-human-soft/60", title: "text-human" },
  ].filter((n) => n.text);
  return (
    <Card className="enter mt-6 p-5">
      <div className="mb-3 text-[14px] font-semibold">Captured tasks</div>
      <div className="divide-y divide-line">
        {interview.tasks.map((t) => (
          <div key={t.id} className="grid items-center gap-3 py-2.5 md:grid-cols-[1fr_220px_92px_auto]">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium">{t.name}</div>
              {t.pain && <div className="mt-0.5 line-clamp-2 text-[12px] text-muted">“{t.pain}”</div>}
            </div>
            {readOnly ? (
              <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                {effectiveProcess(t)}
                {t.judgment && <Confidence judgment={t.judgment} />}
              </div>
            ) : (
              <select
                value={t.process}
                onChange={(e) => onEdit(t.id, { process: e.target.value, judgment: undefined })}
                aria-label={`Process for ${t.name}`}
                className="h-8 rounded-md bg-surface px-2 text-[12.5px] shadow-[0_0_0_1px_var(--color-line-strong)] outline-none"
              >
                {[...processes.map((p) => p.name), OTHER].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1 text-[12.5px] text-muted">
              {readOnly ? (
                <span className="tabular-nums">{t.hoursPerWeek}</span>
              ) : (
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={t.hoursPerWeek}
                  onChange={(e) => onEdit(t.id, { hoursPerWeek: Number(e.target.value) })}
                  className="h-8 w-16 text-right tabular-nums"
                  aria-label={`Hours per week for ${t.name}`}
                />
              )}
              h/wk
            </div>
            <div className="flex justify-end">
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(t.id)}
                  aria-label={`Remove ${t.name}`}
                  className="pressable grid size-7 place-items-center rounded-md text-faint hover:bg-sunken hover:text-bad"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <div className="mt-4 grid gap-3 text-[12.5px] md:grid-cols-3">
          {notes.map((n) => (
            <div key={n.label} className={clsx("rounded-lg p-3", n.tone)}>
              <div className={clsx("mb-1 font-medium", n.title)}>{n.label}</div>
              <div className="leading-relaxed text-ink-2">{n.text}</div>
            </div>
          ))}
        </div>
      )}
      {children && <div className="mt-5 flex justify-end">{children}</div>}
    </Card>
  );
}
