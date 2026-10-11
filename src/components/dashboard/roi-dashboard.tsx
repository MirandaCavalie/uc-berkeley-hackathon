"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Badge, Empty, PageHeader, Skeleton } from "@/components/ui";
import { forecastByArea, forecastOpportunity, portfolioSummary, reportedValueByTeam, trackInitiative, type ForecastContext } from "@/lib/engine/roi";
import { FOLLOWUP_LABEL, followupInitiatives } from "@/lib/seed-followup";
import { useHydrated, useStore } from "@/lib/store";
import { useDecisions } from "@/lib/use-decisions";
import { ForecastSegment } from "./forecast-segment";
import { kindMeta, KindLabel, type Kind } from "./labels";
import { TodaySegment } from "./today-segment";

// Day-granular so the snapshot is stable; null on the server, where there is no saved state anyway.
const today = () => new Date().toISOString().slice(0, 10);
const noSubscribe = () => () => {};
const useToday = () => useSyncExternalStore(noSubscribe, today, () => null);

const questions = [
  { href: "#today", q: "How much have we invested, and what is coming back?" },
  { href: "#working", q: "Where is it working?" },
  { href: "#next", q: "What should we do next?" },
];

export function RoiDashboard() {
  const hydrated = useHydrated();
  const asOf = useToday();
  const { opportunities, analysis, completed, running, run } = useDecisions();
  const autoRan = useRef(false);
  const workspace = useStore((s) => s.workspace);
  const interviews = useStore((s) => s.interviews);
  const roi = useStore((s) => s.roi);
  const helpers = useStore((s) => s.personalHelpers);

  useEffect(() => {
    if (!hydrated || !completed || analysis || running || autoRan.current) return;
    autoRan.current = true;
    void run();
  }, [analysis, completed, hydrated, run, running]);

  if (!hydrated || !asOf)
    return (
      <div>
        <PageHeader title="AI returns" />
        <Skeleton className="mb-6 h-24" />
        <Skeleton className="mb-6 h-32" />
        <Skeleton className="h-80" />
      </div>
    );

  if (!completed)
    return (
      <div>
        <PageHeader title="AI returns" />
        <Empty
          icon={<Coins className="size-5" />}
          title="Start with Discovery"
          action={
            <Link href="/discovery" className="pressable inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-[13.5px] font-medium text-white hover:bg-accent-2">
              Interview the team
            </Link>
          }
        >
          Complete the first employee interview and Fieldwork will build the rest of the engagement from evidence.
        </Empty>
      </div>
    );

  if (running && !analysis)
    return (
      <div>
        <PageHeader title="AI returns" />
        <Empty icon={<Coins className="size-5" />} title="Preparing the first return view">
          Fieldwork is reviewing the completed interviews and turning the evidence into opportunities.
        </Empty>
      </div>
    );

  if (!analysis) return null;

  const ctx: ForecastContext = { interviews, roster: workspace.teamRoster, roi, judgments: analysis.judgments };
  const forecasts = new Map(opportunities.map((o) => [o.id, forecastOpportunity(o, ctx)]));
  const initiatives = followupInitiatives({ workspace, helpers, interviews, roi, asOf });
  const tracked = initiatives.map((i) => trackInitiative(i, forecasts.get(i.opportunityId) ?? null, roi, asOf));
  const buildable = opportunities.filter((o) => o.solution !== "human");
  const areas = forecastByArea(buildable, ctx);
  const live = new Set(initiatives.map((i) => i.opportunityId));
  const next = buildable
    .filter((o) => !live.has(o.id))
    .map((o) => ({ o, f: forecasts.get(o.id)! }))
    .sort((a, b) => b.f.base.net12 - a.f.base.net12)
    .slice(0, 3);
  const simulated = initiatives.some((i) => i.source === "simulated");

  return (
    <div>
      <PageHeader title="AI returns" actions={workspace.synthetic ? <Badge tone="warn">{FOLLOWUP_LABEL}</Badge> : null} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {questions.map((item, i) => (
          <a key={item.href} href={item.href} className="pressable group rounded-xl bg-surface p-4 shadow-card hover:shadow-raised">
            <div className="text-[12px] text-muted tabular-nums">{i + 1}</div>
            <div className="mt-1 text-[14px] leading-snug font-semibold tracking-tight text-ink group-hover:text-accent">{item.q}</div>
          </a>
        ))}
      </div>
      <div className="mb-10 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
        <span className="font-medium text-ink-2">{workspace.company}</span>
        {(Object.keys(kindMeta) as Kind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <KindLabel kind={k} /> {kindMeta[k].means}
          </span>
        ))}
      </div>

      <TodaySegment
        tracked={tracked}
        summary={portfolioSummary(tracked)}
        byTeam={reportedValueByTeam(tracked, areas)}
        hourlyCost={roi.hourlyCost}
        simulated={simulated}
        helperRuns={helpers.reduce((n, h) => n + h.runs.length, 0)}
      />
      <ForecastSegment areas={areas} next={next} roi={roi} />
    </div>
  );
}
