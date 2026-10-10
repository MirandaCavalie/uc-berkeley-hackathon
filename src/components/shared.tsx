"use client";

import clsx from "clsx";
import { AlertTriangle, Scale } from "lucide-react";
import type { Judgment, JudgmentReport } from "@/lib/types";

export function JevStamp({ judgments, createdAt, warning }: { judgments: JudgmentReport | null; createdAt: string; warning: string | null }) {
  const flagged = judgments ? Object.values(judgments.items).filter((j) => !j.applied).length : 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
        {judgments ? (
          <span className="inline-flex items-center gap-1" title={`${judgments.model} · ${judgments.inputTokens.toLocaleString()} input tokens`}>
            <Scale className="size-3.5 text-accent" />
            {judgments.questions} decisions by Jev in {(judgments.latencyMs / 1000).toFixed(1)}s
            {flagged > 0 && <span className="text-warn">· {flagged} below confidence, rules kept</span>}
          </span>
        ) : (
          <span>Rule-based estimates</span>
        )}
        <span>·</span>
        <span suppressHydrationWarning>{new Date(createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
}

export function Confidence({ judgment, className }: { judgment: Judgment; className?: string }) {
  const pct = Math.round(judgment.confidence * 100);
  const odds = Object.entries(judgment.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, p]) => `${k} ${Math.round(p * 100)}%`)
    .join(" · ");
  return (
    <span
      title={`Jev ${judgment.applied ? "decided" : "was unsure, rule kept"}: ${odds}${judgment.rule !== judgment.label ? `. Rule said ${judgment.rule}.` : ""}`}
      className={clsx(
        "inline-flex items-center gap-1 rounded px-1 py-px text-[10.5px] font-medium tabular-nums",
        judgment.applied ? "bg-sunken text-muted" : "bg-warn-soft text-warn",
        className,
      )}
    >
      <Scale className="size-3" />
      {pct}%
    </span>
  );
}
