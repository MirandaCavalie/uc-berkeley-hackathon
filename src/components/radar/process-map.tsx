"use client";

import clsx from "clsx";
import { ChevronRight, Clock, User, Wrench } from "lucide-react";
import { useState } from "react";
import { Quote } from "@/components/shared";
import { ModeBadge } from "@/components/ui";
import type { ProcessStep, WorkMode } from "@/lib/schemas";
import { modeMeta } from "@/lib/scoring";

const ring: Record<WorkMode, string> = {
  automate: "before:bg-automate",
  assist: "before:bg-assist",
  human: "before:bg-human",
};

export function ProcessMap({ steps, highlight = [] }: { steps: ProcessStep[]; highlight?: string[] }) {
  const [selected, setSelected] = useState<string | null>(highlight.find((id) => steps.some((s) => s.id === id)) ?? steps[0]?.id ?? null);
  const step = steps.find((s) => s.id === selected);
  const maxHours = Math.max(...steps.map((s) => s.hoursPerCycle), 1);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-3 scrollbar-thin">
        <ol className="flex min-w-max items-stretch">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setSelected(s.id)}
                style={{ "--i": i } as React.CSSProperties}
                className={clsx(
                  "enter pressable relative w-[168px] overflow-hidden rounded-xl bg-surface p-3 pt-4 text-left before:absolute before:inset-x-0 before:top-0 before:h-1",
                  ring[s.mode],
                  selected === s.id ? "shadow-[0_0_0_1.5px_var(--color-ink),var(--shadow-raised)]" : "shadow-card hover:shadow-raised",
                )}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-faint">
                  <span className="tabular-nums">Step {i + 1}</span>
                  {highlight.includes(s.id) && <span className="rounded bg-accent-soft px-1 text-[10.5px] font-medium text-accent">Pilot</span>}
                </div>
                <div className="line-clamp-2 min-h-[36px] text-[13px] leading-snug font-medium">{s.name}</div>
                <div className="mt-2 text-[11.5px] text-muted">{s.owner}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div
                      className={clsx("reveal-bar h-full rounded-full", s.mode === "automate" ? "bg-automate" : s.mode === "assist" ? "bg-assist" : "bg-human")}
                      style={{ width: `${(s.hoursPerCycle / maxHours) * 100}%`, "--i": i } as React.CSSProperties}
                    />
                  </div>
                  <span className="text-[11px] text-muted tabular-nums">{s.hoursPerCycle}h</span>
                </div>
              </button>
              {i < steps.length - 1 && <ChevronRight className="mx-0.5 size-4 shrink-0 text-faint" />}
            </li>
          ))}
        </ol>
      </div>

      {step && (
        <div key={step.id} className="enter mt-2 grid gap-5 rounded-xl bg-surface p-5 shadow-card md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold tracking-tight">{step.name}</h3>
              <ModeBadge mode={step.mode} />
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-2">{step.rationale}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5" /> {step.owner}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> {step.hoursPerCycle} h per campaign × {step.cyclesPerMonth}/mo
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
            <div className="mt-4 text-[12px] text-muted">
              <span className="font-medium text-ink-2">{modeMeta[step.mode].short}.</span> {modeMeta[step.mode].description}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Evidence</div>
            {step.evidence.length ? step.evidence.map((q, i) => <Quote key={i} quote={q} />) : <div className="text-[12.5px] text-faint">No direct quote — inferred from timeline.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
