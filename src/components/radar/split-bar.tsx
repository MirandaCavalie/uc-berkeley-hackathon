"use client";

import type { ProcessStep, WorkMode } from "@/lib/schemas";
import { creativeShare, modeMeta } from "@/lib/scoring";

const order: WorkMode[] = ["automate", "assist", "human"];
const bg: Record<WorkMode, string> = { automate: "bg-automate", assist: "bg-assist", human: "bg-human" };
const text: Record<WorkMode, string> = { automate: "text-automate", assist: "text-assist", human: "text-human" };

export function SplitBar({ steps, compact = false }: { steps: ProcessStep[]; compact?: boolean }) {
  const split = creativeShare(steps);
  const pct: Record<WorkMode, number> = { automate: split.automatePct, assist: split.assistPct, human: split.humanPct };

  return (
    <div>
      <div className={`flex w-full gap-1 overflow-hidden rounded-lg ${compact ? "h-2.5" : "h-4"}`}>
        {order.map((m, i) =>
          split.hours[m] > 0 ? (
            <div key={m} className={`reveal-bar ${bg[m]} rounded-[5px]`} style={{ width: `${pct[m]}%`, "--i": i } as React.CSSProperties} title={`${modeMeta[m].label}: ${pct[m]}%`} />
          ) : null,
        )}
      </div>
      {!compact && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {order.map((m) => (
            <div key={m}>
              <div className="flex items-baseline gap-2">
                <span className={`text-[28px] font-semibold tracking-tight tabular-nums ${text[m]}`}>{pct[m]}%</span>
                <span className="text-[12.5px] text-muted tabular-nums">{Math.round(split.hours[m])} h / month</span>
              </div>
              <div className="text-[13px] font-medium">{modeMeta[m].label}</div>
              <div className="text-[12.5px] leading-relaxed text-muted">{modeMeta[m].description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
