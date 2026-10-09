"use client";

import clsx from "clsx";
import { Check, ChevronRight, Clock, Undo2, User, Wrench } from "lucide-react";
import { useState } from "react";
import { Quote } from "@/components/shared";
import { ModeBadge } from "@/components/ui";
import type { ProcessStep, WorkMode } from "@/lib/schemas";
import { modeMeta, stepKey } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import type { Judgment } from "@/lib/types";

const ring: Record<WorkMode, string> = {
  automate: "before:bg-automate",
  assist: "before:bg-assist",
  human: "before:bg-human",
};

const bar: Record<WorkMode, string> = { automate: "bg-automate", assist: "bg-assist", human: "bg-human" };

const modes: WorkMode[] = ["automate", "assist", "human"];

export function ProcessMap({
  steps,
  highlight = [],
  judgments,
}: {
  steps: ProcessStep[];
  highlight?: string[];
  judgments?: Record<string, Judgment>;
}) {
  const reviews = useStore((s) => s.stepReviews);
  const reviewStep = useStore((s) => s.reviewStep);
  const clearStepReview = useStore((s) => s.clearStepReview);
  const [selected, setSelected] = useState<string | null>(highlight.find((id) => steps.some((s) => s.id === id)) ?? steps[0]?.id ?? null);
  const step = steps.find((s) => s.id === selected);
  const maxHours = Math.max(...steps.map((s) => s.hoursPerCycle), 1);
  const confirmed = steps.filter((s) => reviews[stepKey(s)]).length;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted">
        <div className="h-1 w-24 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-good transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${(confirmed / Math.max(steps.length, 1)) * 100}%` }} />
        </div>
        <span className="tabular-nums">
          {confirmed}/{steps.length} confirmed by the team
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-3 scrollbar-thin">
        <ol className="flex min-w-max items-stretch">
          {steps.map((s, i) => {
            const review = reviews[stepKey(s)];
            const mode = review?.mode ?? s.mode;
            const unsure = !review && judgments?.[`step:${s.id}`]?.applied === false;
            return (
              <li key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setSelected(s.id)}
                  style={{ "--i": i } as React.CSSProperties}
                  className={clsx(
                    "enter pressable relative w-[168px] overflow-hidden rounded-xl bg-surface p-3 pt-4 text-left before:absolute before:inset-x-0 before:top-0 before:h-1",
                    ring[mode],
                    selected === s.id ? "shadow-[0_0_0_1.5px_var(--color-ink),var(--shadow-raised)]" : "shadow-card hover:shadow-raised",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-faint">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {i + 1}
                      {review && <Check className="size-3 text-good" />}
                    </span>
                    {highlight.includes(s.id) ? (
                      <span className="rounded bg-accent-soft px-1 text-[10.5px] font-medium text-accent">Pilot</span>
                    ) : (
                      unsure && <span className="rounded bg-warn-soft px-1 text-[10.5px] font-medium text-warn">Check</span>
                    )}
                  </div>
                  <div className="line-clamp-2 min-h-[36px] text-[13px] leading-snug font-medium">{s.name}</div>
                  <div className="mt-2 text-[11.5px] text-muted">{s.owner}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
                      <div className={clsx("reveal-bar h-full rounded-full", bar[mode])} style={{ width: `${(s.hoursPerCycle / maxHours) * 100}%`, "--i": i } as React.CSSProperties} />
                    </div>
                    <span className="text-[11px] text-muted tabular-nums">{s.hoursPerCycle}h</span>
                  </div>
                </button>
                {i < steps.length - 1 && <ChevronRight className="mx-0.5 size-4 shrink-0 text-faint" />}
              </li>
            );
          })}
        </ol>
      </div>

      {step && (
        <StepDetail
          key={step.id}
          step={step}
          review={reviews[stepKey(step)]}
          judgment={judgments?.[`step:${step.id}`]}
          onReview={(m) => reviewStep(stepKey(step), m)}
          onUndo={() => clearStepReview(stepKey(step))}
        />
      )}
    </div>
  );
}

function StepDetail({
  step,
  review,
  judgment,
  onReview,
  onUndo,
}: {
  step: ProcessStep;
  review: { mode: WorkMode } | undefined;
  judgment: Judgment | undefined;
  onReview: (m: WorkMode) => void;
  onUndo: () => void;
}) {
  const mode = review?.mode ?? step.mode;
  return (
    <div className="enter mt-2 grid gap-5 rounded-xl bg-surface p-5 shadow-card md:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-semibold tracking-tight">{step.name}</h3>
          <ModeBadge mode={mode} />
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink-2">{step.rationale}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" /> {step.owner}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> {step.hoursPerCycle} h × {step.cyclesPerMonth}/mo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wrench className="size-3.5" /> {step.tools.join(", ")}
          </span>
        </div>
        {step.pains.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {step.pains.map((p) => (
              <li key={p} className="flex gap-2 text-[13px] text-ink-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />
                {p}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-lg bg-sunken/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
            <span className="font-medium text-ink-2">Team check</span>
            {review ? (
              <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 text-muted hover:text-ink">
                <Undo2 className="size-3" /> Undo
              </button>
            ) : judgment && !judgment.applied ? (
              <span className="text-warn">Jev unsure, needs a team check</span>
            ) : (
              <span className="text-faint">Not confirmed</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onReview(m)}
                className={clsx(
                  "pressable flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px]",
                  review && mode === m ? "bg-ink text-white" : "bg-surface text-ink-2 shadow-card hover:bg-[#fbfaf7]",
                )}
              >
                <span className={clsx("size-1.5 rounded-full", bar[m])} />
                {modeMeta[m].label}
                {!review && step.mode === m && <span className="text-[10.5px] text-faint">AI</span>}
                {judgment && (
                  <span className={clsx("text-[10.5px] tabular-nums", review && mode === m ? "text-white/70" : "text-faint")}>
                    {Math.round((judgment.probabilities[m] ?? 0) * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
          {judgment && !review && (
            <div className="mt-2 text-[11.5px] text-muted">
              Jev: {modeMeta[judgment.label as WorkMode]?.label ?? judgment.label} at {Math.round(judgment.confidence * 100)}% confidence
              {judgment.applied
                ? judgment.rule !== judgment.label && `, overriding the rule (${modeMeta[judgment.rule as WorkMode]?.label ?? judgment.rule})`
                : `, so the rule result (${modeMeta[judgment.rule as WorkMode]?.label ?? judgment.rule}) stays`}
              .
            </div>
          )}
          {review && review.mode !== step.mode && (
            <div className="mt-2 text-[11.5px] text-muted">
              Changed from {modeMeta[step.mode].label}. Applied on every run.
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Evidence</div>
        {step.evidence.length ? step.evidence.map((q, i) => <Quote key={i} quote={q} />) : <div className="text-[12.5px] text-faint">Inferred from timeline</div>}
      </div>
    </div>
  );
}
