import type { EvidenceItem, Interview } from "../types";
import { WEEKS_PER_MONTH } from "./interview";
import { daysBetween, parseCsv } from "./text";

/** Share of consolidation time that is collecting, de-duplicating, and retyping comments. */
export const CONSOLIDATION_CAPTURE = 0.8;

export interface LoopBaseline {
  rounds: number | null;
  consolidationDays: number | null;
  loopDays: number | null;
  conflictRounds: number;
  handReconciled: number | null;
  reportedRounds: number | null;
  reportedHoursPerRound: number | null;
  reporters: string[];
  consolidationHoursPerMonth: number | null;
  waitingOnFeedback: string[];
  quotes: { person: string; role: string; text: string }[];
}

const REVIEW = /creative review/i;
const CONSOLIDATION = /consolidat/i;
const LOOP = /creative review|consolidat|revision/i;
const FEEDBACK = /feedback|comments?|consolidat|reconcil|round/i;

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function loopBaseline(evidence: EvidenceItem[], interviews: Interview[]): LoopBaseline {
  const rows = evidence.filter((e) => e.kind === "approvals").flatMap((e) => parseCsv(e.content)).filter((r) => r.stage);
  const reviewRows = rows.filter((r) => REVIEW.test(r.stage));
  const consolidationRows = rows.filter((r) => CONSOLIDATION.test(r.stage));
  const loopRows = rows.filter((r) => LOOP.test(r.stage) && r.start && r.end);
  const reconciled = consolidationRows.map((r) => Number(r.notes?.match(/(\d+)\s+comments/i)?.[1])).filter(Number.isFinite);
  const loopStart = loopRows.map((r) => r.start).sort()[0];
  const loopEnd = loopRows.map((r) => r.end).sort().at(-1);

  const done = interviews.filter((i) => i.status === "completed");
  const loopReports = done.filter((i) => i.loop && (i.loop.rounds != null || i.loop.hoursPerRound != null));
  const consolidationTasks = done.flatMap((i) => i.tasks.filter((t) => t.stage === "Feedback consolidation").map((t) => ({ ...t, person: i.name, role: i.role })));
  const consolidationHours = consolidationTasks.reduce((n, t) => n + t.hoursPerWeek, 0) * WEEKS_PER_MONTH;

  return {
    rounds: reviewRows.length || null,
    consolidationDays: consolidationRows.length ? consolidationRows.reduce((n, r) => n + daysBetween(r.start, r.end), 0) : null,
    loopDays: loopStart && loopEnd ? daysBetween(loopStart, loopEnd) : null,
    conflictRounds: reviewRows.filter((r) => /conflict/i.test(r.notes ?? "")).length,
    handReconciled: reconciled.length ? reconciled.reduce((a, b) => a + b, 0) : null,
    reportedRounds: avg(loopReports.map((i) => i.loop!.rounds).filter((n): n is number => n != null)),
    reportedHoursPerRound: avg(loopReports.map((i) => i.loop!.hoursPerRound).filter((n): n is number => n != null)),
    reporters: loopReports.map((i) => i.name),
    consolidationHoursPerMonth: consolidationHours ? Math.round(consolidationHours) : null,
    waitingOnFeedback: done.filter((i) => FEEDBACK.test(i.waits)).map((i) => i.name),
    quotes: [
      ...consolidationTasks.filter((t) => t.pain).map((t) => ({ person: t.person, role: t.role, text: t.pain })),
      ...done.filter((i) => FEEDBACK.test(i.waits)).map((i) => ({ person: i.name, role: i.role, text: i.waits })),
    ],
  };
}

export function hoursRecovered(b: LoopBaseline): number | null {
  return b.consolidationHoursPerMonth != null ? Math.round(b.consolidationHoursPerMonth * CONSOLIDATION_CAPTURE) : null;
}
