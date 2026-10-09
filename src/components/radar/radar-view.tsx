"use client";

import { Info, Radar } from "lucide-react";
import { toast } from "sonner";
import { EngineStamp, useTask } from "@/components/shared";
import { Button, Card, Empty, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { applyStepReviews, rankOpportunities } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import { EvidencePanel } from "./evidence-panel";
import { OpportunityCard } from "./opportunity-card";
import { ProcessMap } from "./process-map";
import { SplitBar } from "./split-bar";

export function RadarView() {
  const evidence = useStore((s) => s.evidence);
  const brand = useStore((s) => s.brand);
  const radar = useStore((s) => s.radar);
  const setRadar = useStore((s) => s.setRadar);
  const log = useStore((s) => s.log);
  const stepReviews = useStore((s) => s.stepReviews);
  const { run, loading } = useTask("radar");

  async function analyze() {
    const res = await run({ evidence, brand });
    if (!res) return;
    setRadar({ ...res, evidenceIds: evidence.map((e) => e.id) });
    const top = res.result.opportunities.find((o) => o.id === res.result.recommendedPilotId);
    log({ workflow: "radar", title: "Radar analysis completed", detail: `${res.result.steps.length} steps mapped · start with ${top?.title ?? "—"}` });
    toast.success("Workflow mapped", { description: `${res.result.steps.length} steps, ${res.result.opportunities.length} opportunities ranked.` });
  }

  const stale = radar && (radar.evidenceIds.length !== evidence.length || radar.evidenceIds.some((id) => !evidence.find((e) => e.id === id)));
  const ranked = radar ? rankOpportunities(radar.result.opportunities) : [];
  const pilot = radar?.result.opportunities.find((o) => o.id === radar.result.recommendedPilotId) ?? ranked[0];

  return (
    <div>
      <PageHeader
        title="Radar"
        actions={
          <Button variant="accent" size="lg" loading={loading} disabled={!evidence.length} onClick={analyze} icon={<Radar className="size-4" />}>
            {radar ? "Re-run Radar" : "Run Radar"}
          </Button>
        }
      />

      <section className="mb-10">
        <SectionTitle title="Evidence" meta={evidence.length} />
        <EvidencePanel />
      </section>

      {loading && <Scanning />}

      {!loading && !radar && (
        <Empty icon={<Radar className="size-5" />} title="No analysis yet" action={<Button variant="primary" onClick={analyze} disabled={!evidence.length}>Run Radar on {evidence.length} files</Button>} />
      )}

      {!loading && radar && (
        <div className="space-y-12">
          <section>
            <SectionTitle title="Hours by mode" />
            <Card className="p-6">
              <p className="mb-5 max-w-3xl text-[15px] leading-relaxed text-ink">{radar.result.summary}</p>
              <SplitBar steps={applyStepReviews(radar.result.steps, stepReviews)} />
              <div className="mt-5 border-t border-line pt-4">
                <EngineStamp
                  engine={radar.engine}
                  createdAt={radar.createdAt}
                  judgments={radar.judgments}
                  warning={stale ? "Evidence changed since this analysis. Re-run Radar to update." : radar.warning}
                />
              </div>
            </Card>
          </section>

          <section>
            <SectionTitle title="Workflow" meta={`${radar.result.steps.length} steps`} />
            <ProcessMap steps={radar.result.steps} highlight={pilot?.stepIds ?? []} judgments={radar.judgments?.items} />
          </section>

          <section>
            <SectionTitle title="Opportunities" meta={ranked.length} />
            <div className="space-y-3">
              {ranked.map((o, i) => (
                <OpportunityCard key={o.id} opp={o} rank={i + 1} index={i} recommended={o.id === pilot?.id} judgments={radar.judgments?.items} />
              ))}
            </div>
          </section>

          {radar.result.assumptions.length > 0 && (
            <section className="rounded-xl bg-sunken/70 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                <Info className="size-3.5" /> Assumptions
              </div>
              <ul className="space-y-1">
                {radar.result.assumptions.map((a) => (
                  <li key={a} className="text-[12.5px] leading-relaxed text-muted">
                    • {a}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Scanning() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[13.5px] text-muted">
        <span className="relative grid size-8 place-items-center">
          <span className="absolute inset-0 rounded-full border border-accent/30" />
          <span className="radar-sweep absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--color-accent)_60deg,transparent_61deg)] opacity-40" />
        </span>
        Analyzing…
      </div>
      <Skeleton className="h-40" />
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-[168px]" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}
