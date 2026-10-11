"use client";

import { Rocket } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Empty, SectionTitle, Stat } from "@/components/ui";
import { money } from "@/lib/engine/opportunities";
import type { InitiativeTracking, PortfolioSummary } from "@/lib/engine/roi";
import { DecisionBadge, decisionMeta, hours, pct, signedMoney } from "./labels";

export function TodaySegment({ tracked, summary }: { tracked: InitiativeTracking[]; summary: PortfolioSummary }) {
  return (
    <section id="today" className="mb-14 scroll-mt-6">
      {tracked.length === 0 ? (
        <Empty
          icon={<Rocket className="size-5" />}
          title="No initiatives live yet"
          action={
            <Link href="/my-work" className="pressable inline-flex h-9 items-center rounded-lg bg-surface px-3.5 text-[13.5px] font-medium shadow-card hover:bg-[#fbfaf7]">
              Open My work
            </Link>
          }
        >
          Employee feedback and usage data will appear here after the first initiative launches.
        </Empty>
      ) : (
        <>
          <Card className="mb-10 grid gap-6 p-6 sm:grid-cols-3">
            <Stat label="Invested to date" value={money(summary.invested)} />
            <Stat label="Value created" value={money(summary.valueReported)} tone="accent" />
            <Stat label="Net return" value={signedMoney(summary.net)} />
          </Card>

          <div id="working" className="scroll-mt-6">
            <SectionTitle title="Live initiatives" meta="Hover over a decision to see why" />
            <InitiativeTable tracked={tracked} />
          </div>
        </>
      )}
    </section>
  );
}

function InitiativeTable({ tracked }: { tracked: InitiativeTracking[] }) {
  const rows = [...tracked].sort((a, b) => decisionMeta[a.decision].order - decisionMeta[b.decision].order || b.valueReported - a.valueReported);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b border-line bg-paper/55 text-left text-[11.5px] font-semibold text-muted">
            <th className="px-4 py-3">Initiative</th>
            <th className="px-4 py-3 text-right">Adoption</th>
            <th className="px-4 py-3 text-right">Time saved / month</th>
            <th className="px-4 py-3 text-right">Value created</th>
            <th className="px-4 py-3">Decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((initiative) => (
            <tr key={initiative.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3.5">
                <div className="font-semibold text-ink">{initiative.name}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">{initiative.teams.join(", ") || "Company-wide"}</div>
              </td>
              <Num>{pct(initiative.adoption)}</Num>
              <Num>{hours(initiative.reportedHours)} h</Num>
              <Num>{money(initiative.valueReported)}</Num>
              <td className="px-4 py-3.5">
                <DecisionBadge decision={initiative.decision} reason={initiative.reason} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3.5 text-right whitespace-nowrap text-ink-2 tabular-nums">{children}</td>;
}
