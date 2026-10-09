"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, Ruler, Target, Waypoints } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Confidence, Quote } from "@/components/shared";
import { Badge, ScoreRing } from "@/components/ui";
import type { Opportunity } from "@/lib/schemas";
import { compositeScore, dimensions } from "@/lib/scoring";
import type { Judgment } from "@/lib/types";

const workflowLink = {
  review: { href: "/review", label: "Open Review Loop" },
  launch: { href: "/launch", label: "Open Campaign Launch" },
  studio: { href: "/studio", label: "Open Creative Studio" },
  none: null,
} as const;

export function OpportunityCard({
  opp,
  rank,
  recommended,
  index,
  judgments,
}: {
  opp: Opportunity;
  rank: number;
  recommended: boolean;
  index: number;
  judgments?: Record<string, Judgment>;
}) {
  const [open, setOpen] = useState(recommended);
  const score = compositeScore(opp.scores);
  const link = workflowLink[opp.workflow];

  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      className={clsx("enter overflow-hidden rounded-xl bg-surface", recommended ? "shadow-[0_0_0_1.5px_var(--color-accent),var(--shadow-raised)]" : "shadow-card")}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="w-5 text-center text-[13px] font-medium text-faint tabular-nums">{rank}</div>
        <ScoreRing value={score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight">{opp.title}</span>
            {recommended && <Badge tone="accent">Start here</Badge>}
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{opp.problem}</p>
        </div>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="enter border-t border-line px-4 pt-4 pb-5 md:pl-[76px]">
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">{opp.problem}</p>

          <div className="mb-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-automate-soft/60 p-3">
              <div className="mb-1 text-[11.5px] font-medium tracking-wide text-automate uppercase">AI takes</div>
              <p className="text-[13px] leading-relaxed text-ink-2">{opp.aiRole}</p>
            </div>
            <div className="rounded-lg bg-human-soft/60 p-3">
              <div className="mb-1 text-[11.5px] font-medium tracking-wide text-human uppercase">People keep</div>
              <p className="text-[13px] leading-relaxed text-ink-2">{opp.humanRole}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="mb-2 text-[11.5px] font-medium tracking-wide text-muted uppercase">Transparent score</div>
              <div className="space-y-1.5">
                {dimensions.map((d, i) => {
                  const raw = opp.scores[d.key];
                  const good = d.inverted ? 6 - raw : raw;
                  const judgment = judgments?.[`score:${opp.id}:${d.key}`];
                  return (
                    <div key={d.key} className="grid grid-cols-[84px_1fr_68px_44px] items-center gap-2" title={d.question}>
                      <span className="text-[12px] text-ink-2">{d.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={clsx("h-1.5 flex-1 rounded-full", n <= raw ? (good >= 4 ? "bg-good" : good >= 3 ? "bg-assist" : "bg-bad/70") : "bg-sunken")}
                            style={{ transitionDelay: `${i * 30}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-right text-[11px] whitespace-nowrap text-muted tabular-nums">
                        {raw}/5 · w{Math.round(d.weight * 100)}%
                      </span>
                      <span className="text-right">
                        {judgment ? <Confidence judgment={judgment} /> : <span className="text-[10.5px] text-faint">{judgments ? "counted" : ""}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                Risk and effort count inversely. Score = weighted average scaled to 100.
                {judgments && " Judgment calls are scored by Jev; impact and frequency are counted from the evidence."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-[11.5px] font-medium tracking-wide text-muted uppercase">Evidence</div>
              {opp.evidence.map((q, i) => (
                <Quote key={i} quote={q} />
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-[12.5px] md:grid-cols-3">
            <Meta icon={<Target className="size-3.5" />} label="Success metric" value={opp.metric} />
            <Meta icon={<Ruler className="size-3.5" />} label="Pilot boundary" value={opp.pilotBoundary} />
            <Meta icon={<Waypoints className="size-3.5" />} label="Next integration" value={opp.nextIntegration} />
          </div>

          {link && (
            <Link
              href={link.href}
              className="pressable mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13.5px] font-medium text-white hover:bg-ink-2"
            >
              {link.label} <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sunken/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
        {icon}
        {label}
      </div>
      <div className="leading-relaxed text-ink-2">{value}</div>
    </div>
  );
}
