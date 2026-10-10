"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { decideOpportunities, judgeTasks } from "./client";
import { buildOpportunities } from "./engine/opportunities";
import { useStore } from "./store";

const completedIds = () =>
  useStore
    .getState()
    .interviews.filter((i) => i.status === "completed")
    .map((i) => i.id);

/** Opportunities from the latest decisions, plus a way to re-run Jev on the current interviews. */
export function useDecisions() {
  const interviews = useStore((s) => s.interviews);
  const roi = useStore((s) => s.roi);
  const analysis = useStore((s) => s.analysis);
  const overrides = useStore((s) => s.overrides);
  const [running, setRunning] = useState(false);

  const opportunities = useMemo(
    () => buildOpportunities(interviews, roi, analysis?.judgments ?? null, overrides),
    [interviews, roi, analysis, overrides],
  );
  const done = interviews.filter((i) => i.status === "completed");
  const stale = Boolean(analysis) && done.some((i) => !analysis?.interviewIds.includes(i.id));

  async function run() {
    const { saveInterview, setAnalysis } = useStore.getState();
    setRunning(true);
    const pending = useStore.getState().interviews.filter((iv) => iv.status === "completed" && iv.tasks.some((t) => t.judgment === undefined));
    if (pending.length) (await judgeTasks(pending))?.forEach(saveInterview);
    try {
      const judgments = await decideOpportunities(useStore.getState().interviews);
      setAnalysis({ createdAt: new Date().toISOString(), interviewIds: completedIds(), judgments, warning: null });
      toast.success("Opportunities decided", { description: `${judgments.questions} decisions by Jev in ${(judgments.latencyMs / 1000).toFixed(1)}s` });
    } catch (e) {
      const warning = `Jev unavailable, using rule-based estimates. ${e instanceof Error ? e.message : ""}`.trim();
      setAnalysis({ createdAt: new Date().toISOString(), interviewIds: completedIds(), judgments: null, warning });
      toast.warning("Using rule-based estimates", { description: warning });
    } finally {
      setRunning(false);
    }
  }

  return { opportunities, analysis, stale, running, run, completed: done.length };
}
