import { daysBetween, parseCsv } from "./engine/text";
import type { EvidenceItem } from "./types";

/** Days a stage took in the first round of the approval timeline, if the evidence has one. */
export function stageBaseline(evidence: EvidenceItem[], stage: RegExp): { days: number; note: string } | null {
  const rows = evidence.filter((e) => e.kind === "approvals").flatMap((e) => parseCsv(e.content));
  const hits = rows.filter((r) => r.stage && stage.test(r.stage));
  if (!hits.length) return null;
  const days = hits.reduce((s, r) => s + daysBetween(r.start, r.end), 0);
  return {
    days,
    note: `${hits.length} occurrence${hits.length > 1 ? "s" : ""} in the approval timeline${hits[0].notes ? ` — “${hits[0].notes}”` : ""}`,
  };
}

export function formatDuration(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round((m / 60) * 10) / 10;
  return `${h} h`;
}
