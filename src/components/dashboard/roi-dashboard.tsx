"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { forecastByArea, forecastOpportunity, portfolioSummary, trackInitiative, type ForecastContext } from "@/lib/engine/roi";
import { followupInitiatives } from "@/lib/seed-followup";
import { useHydrated, useStore } from "@/lib/store";
import { useDecisions } from "@/lib/use-decisions";
import { ForecastSegment } from "./forecast-segment";
import { TodaySegment } from "./today-segment";

// Day-granular so the snapshot is stable; null on the server, where there is no saved state anyway.
const today = () => new Date().toISOString().slice(0, 10);
const noSubscribe = () => () => {};
const useToday = () => useSyncExternalStore(noSubscribe, today, () => null);

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
        <PageHeader title="Dashboard" />
        <Skeleton className="mb-6 h-24" />
        <Skeleton className="mb-6 h-32" />
        <Skeleton className="h-80" />
      </div>
    );

  if (!completed)
    return (
      <div>
        <PageHeader title="Dashboard" />
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
        <PageHeader title="Dashboard" />
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

  return (
    <div>
      <PageHeader title="Dashboard" />

      <TodaySegment
        tracked={tracked}
        summary={portfolioSummary(tracked)}
      />
      <ForecastSegment areas={areas} next={next} roi={roi} />
    </div>
  );
}
