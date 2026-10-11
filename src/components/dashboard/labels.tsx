"use client";

import clsx from "clsx";
import { Check, CircleStop, Hourglass, TrendingUp, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { money } from "@/lib/engine/opportunities";
import type { Decision, EvidenceStrength } from "@/lib/engine/roi";

export const decisionMeta: Record<Decision, { label: string; explanation: string; tone: "good" | "neutral" | "warn" | "bad" | "accent"; icon: ReactNode; order: number }> = {
  scale: { label: "Scale", explanation: "Results and adoption are strong enough to expand this initiative.", tone: "good", icon: <TrendingUp className="size-3" />, order: 0 },
  "on-track": { label: "On track", explanation: "The initiative is performing as expected. Keep monitoring it.", tone: "accent", icon: <Check className="size-3" />, order: 1 },
  fix: { label: "Fix", explanation: "Adoption or usefulness is below the target. Improve it before expanding.", tone: "warn", icon: <Wrench className="size-3" />, order: 2 },
  stop: { label: "Stop", explanation: "The ongoing cost is higher than the value being created.", tone: "bad", icon: <CircleStop className="size-3" />, order: 3 },
  "too-early": { label: "Too early", explanation: "There is not enough time or evidence to make a decision yet.", tone: "neutral", icon: <Hourglass className="size-3" />, order: 4 },
};

export function DecisionBadge({ decision, reason }: { decision: Decision; reason?: string }) {
  const meta = decisionMeta[decision];
  const detail = `${meta.explanation}${reason ? ` ${reason}` : ""}`;
  return (
    <span title={detail} aria-label={`${meta.label}: ${detail}`} className="inline-flex cursor-help">
      <Badge tone={meta.tone}>
        {meta.icon}
        {meta.label}
      </Badge>
    </span>
  );
}

const evidenceDots: Record<EvidenceStrength, number> = { strong: 3, medium: 2, weak: 1 };

export function EvidenceMeter({ strength, people, confidence }: { strength: EvidenceStrength; people: number; confidence: number | null }) {
  const label = strength[0].toUpperCase() + strength.slice(1);
  const detail = `${people} ${people === 1 ? "employee" : "employees"} contributed evidence · ${confidence === null ? "rule-based classification" : `classification confidence ${Math.round(confidence * 100)}%`}`;
  return (
    <span title={detail} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={clsx("size-1.5 rounded-full", i <= evidenceDots[strength] ? "bg-ink-2" : "bg-line-strong")} />
        ))}
      </span>
      {label}
    </span>
  );
}

/** One decimal below 10 h, so a few minutes of time doesn't read as zero. */
export const hours = (n: number) => (n > 0 && n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString());
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const signedMoney = (n: number) => (n < 0 ? `−${money(-n)}` : money(n));
export const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}%`;
