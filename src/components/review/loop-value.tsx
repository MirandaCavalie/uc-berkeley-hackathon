"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { formatDuration } from "@/lib/baseline";
import { CONSOLIDATION_CAPTURE, hoursRecovered, loopBaseline } from "@/lib/engine/loop";
import { useStore } from "@/lib/store";

export function LoopValue() {
  const evidence = useStore((s) => s.evidence);
  const interviews = useStore((s) => s.interviews);
  const review = useStore((s) => s.review);
  const b = loopBaseline(evidence, interviews);
  const recovered = hoursRecovered(b);
  const r = review?.result;
  const elapsed = review?.approvedAt ? Date.parse(review.approvedAt) - Date.parse(review.createdAt) : null;
  const brandConflicts = r ? r.conflicts.filter((c) => c.commentIds.some((id) => id.startsWith("brand-"))).length : 0;

  return (
    <Card className="enter mb-10 overflow-hidden">
      <div className="grid md:grid-cols-[1fr_auto_1fr]">
        <div className="p-5">
          <div className="mb-3 text-[12px] font-medium tracking-wide text-muted uppercase">Today</div>
          <div className="space-y-2.5">
            <Row label="Review rounds per asset" value={b.rounds ?? b.reportedRounds ?? "—"} note={b.reportedRounds && b.rounds ? `designers report ${b.reportedRounds}` : undefined} />
            <Row
              label="Consolidating feedback"
              value={b.consolidationDays != null ? `${b.consolidationDays} days` : b.reportedHoursPerRound != null ? `${b.reportedHoursPerRound} h/round` : "—"}
              note={b.handReconciled ? `${b.handReconciled} comments reconciled by hand` : undefined}
            />
            <Row label="Time spent consolidating" value={b.consolidationHoursPerMonth != null ? `${b.consolidationHoursPerMonth} h/mo` : "—"} note={b.consolidationHoursPerMonth != null ? "from interviews" : undefined} />
            <Row label="First review to final revision" value={b.loopDays != null ? `${b.loopDays} days` : "—"} note={b.conflictRounds ? `${b.conflictRounds} round caused by conflicting direction` : undefined} />
          </div>
        </div>
        <div className="hidden items-center md:flex">
          <ArrowRight className="size-5 text-faint" />
        </div>
        <div className="border-t border-line bg-automate-soft/40 p-5 md:border-t-0 md:border-l">
          <div className="mb-3 text-[12px] font-medium tracking-wide text-automate uppercase">With Review Loop</div>
          <div className="space-y-2.5">
            <Row label="Comments consolidated" value={r ? r.comments.length : "All channels"} note={r ? `${r.duplicates.length} duplicates counted once, none retyped` : "Slack, email, and Figma in one pass"} />
            <Row
              label="Consolidating feedback"
              value={elapsed != null ? formatDuration(elapsed) : r ? "In progress" : "Minutes"}
              note={elapsed != null ? "measured on this round" : "measured once you approve the brief"}
            />
            <Row
              label="Time recovered"
              value={recovered != null ? `~${recovered} h/mo` : "—"}
              note={`assumes ${Math.round(CONSOLIDATION_CAPTURE * 100)}% of consolidation is collecting and retyping`}
            />
            <Row
              label="Conflicts decided before revision"
              value={r ? r.conflicts.length : "Every one"}
              note={r ? `${brandConflicts} against the brand book · each with a named owner` : "each routed to a named owner"}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-human-soft/40 px-5 py-2.5 text-[12.5px] text-ink-2">
        <span className="font-medium text-human">Designers keep the design.</span> AI organizes the feedback; it never edits the asset or picks a side.
      </div>
    </Card>
  );
}

function Row({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] text-ink-2">{label}</div>
        {note && <div className="text-[11.5px] text-faint">{note}</div>}
      </div>
      <div className="shrink-0 text-[17px] font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
