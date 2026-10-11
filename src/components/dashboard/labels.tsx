"use client";

import clsx from "clsx";
import { Check, CircleStop, Hourglass, TrendingUp, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { money } from "@/lib/engine/opportunities";
import type { Decision, EvidenceStrength } from "@/lib/engine/roi";

export type Kind = "predicted" | "reported" | "measured";

export const kindMeta: Record<Kind, { label: string; dot: string; means: string }> = {
  predicted: { label: "Predicted", dot: "bg-accent", means: "Our forecast from interviews, before anything is built." },
  reported: { label: "Reported", dot: "bg-signal", means: "What employees and owners reported in follow-ups." },
  measured: { label: "Measured", dot: "bg-ink", means: "Counted from run logs." },
};

/** Every number on the dashboard carries one of these. */
export function KindLabel({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <span title={kindMeta[kind].means} className={clsx("inline-flex items-center gap-1 text-[10.5px] font-medium tracking-wide text-muted uppercase", className)}>
      <span className={clsx("size-1.5 rounded-full", kindMeta[kind].dot)} />
      {kindMeta[kind].label}
    </span>
  );
}

export const decisionMeta: Record<Decision, { label: string; tone: "good" | "neutral" | "warn" | "bad" | "accent"; icon: ReactNode; order: number }> = {
  scale: { label: "Scale", tone: "good", icon: <TrendingUp className="size-3" />, order: 0 },
  "on-track": { label: "On track", tone: "accent", icon: <Check className="size-3" />, order: 1 },
  fix: { label: "Fix", tone: "warn", icon: <Wrench className="size-3" />, order: 2 },
  stop: { label: "Stop", tone: "bad", icon: <CircleStop className="size-3" />, order: 3 },
  "too-early": { label: "Too early", tone: "neutral", icon: <Hourglass className="size-3" />, order: 4 },
};

export function DecisionBadge({ decision, reason }: { decision: Decision; reason?: string }) {
  const meta = decisionMeta[decision];
  return (
    <span title={reason} className="inline-flex">
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
  const detail = `${people} ${people === 1 ? "person" : "people"} reported it · ${confidence === null ? "no Jev confidence (rule-based)" : `Jev confidence ${Math.round(confidence * 100)}%`}`;
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

/** One decimal below 10 h, so a few minutes of reported time doesn't read as zero. */
export const hours = (n: number) => (n > 0 && n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString());
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const signedMoney = (n: number) => (n < 0 ? `−${money(-n)}` : money(n));
export const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}%`;
