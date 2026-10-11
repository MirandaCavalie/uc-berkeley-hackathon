"use client";

import clsx from "clsx";
import { Check, CircleStop, Hourglass, TrendingUp, Wrench } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const tooltipId = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState({ open: false, left: 0, top: 0 });

  function showTooltip() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width));
    setTooltip({ open: true, left, top: rect.bottom + 8 });
  }

  function hideTooltip() {
    setTooltip((current) => ({ ...current, open: false }));
  }

  return (
    <span
      ref={anchor}
      tabIndex={0}
      aria-describedby={tooltipId}
      aria-label={`${meta.label}: ${detail}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
    >
      <Badge tone={meta.tone}>
        {meta.icon}
        {meta.label}
      </Badge>
      {typeof document !== "undefined" && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          aria-hidden={!tooltip.open}
          style={{ left: tooltip.left, top: tooltip.top, width: "min(320px, calc(100vw - 24px))" }}
          className={clsx(
            "pointer-events-none fixed z-50 rounded-xl bg-ink px-3.5 py-3 text-left text-[12px] leading-5 text-white shadow-raised transition-[opacity,transform] duration-150 ease-out",
            tooltip.open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <span className="block font-semibold">{meta.explanation}</span>
          {reason && <span className="mt-1 block text-white/70">{reason}</span>}
        </span>,
        document.body,
      )}
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
