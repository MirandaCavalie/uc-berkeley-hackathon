"use client";

import { decisionPayload } from "./engine/opportunities";
import type { InterviewTurnDecision, InterviewTurnInput } from "./ai/interview-agent";
import type { Interview, JudgmentReport } from "./types";

async function post(path: string, body: unknown): Promise<JudgmentReport> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "The server returned an unreadable response." }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data as JudgmentReport;
}

/** Asks Jev which process each interviewed task belongs to; returns null when Jev is off or fails. */
export async function judgeTasks(interviews: Interview[]): Promise<Interview[] | null> {
  const tasks = interviews.flatMap((iv) =>
    iv.tasks.map((t) => ({ id: t.id, name: t.name, role: iv.role, pain: t.pain, tools: t.tools, process: t.process })),
  );
  if (!tasks.length) return null;
  const report = await post("/api/decide/tasks", { tasks }).catch(() => null);
  if (!report) return null;
  return interviews.map((iv) => ({ ...iv, tasks: iv.tasks.map((t) => ({ ...t, judgment: report.items[t.id] ?? null })) }));
}

/** Asks Jev for the solution type and readiness scores of every opportunity. */
export function decideOpportunities(interviews: Interview[]): Promise<JudgmentReport> {
  return post("/api/decide/opportunities", { opportunities: decisionPayload(interviews) });
}

/** Lets the server-side agent choose whether the next turn needs a guarded follow-up. */
export async function interviewTurn(input: InterviewTurnInput): Promise<InterviewTurnDecision> {
  const res = await fetch("/api/interview/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({ error: "The interview agent returned an unreadable response." }));
  if (!res.ok) throw new Error(data.error ?? `Interview agent failed (${res.status}).`);
  return data as InterviewTurnDecision;
}
