"use client";

import { taskStages } from "./engine/interview";
import type { TaskKey, TaskResult } from "./schemas";
import type { AnalysisEngine, Interview, JudgmentReport } from "./types";

export interface TaskResponse<K extends TaskKey> {
  result: TaskResult<K>;
  engine: AnalysisEngine;
  warning: string | null;
  judgments: JudgmentReport | null;
}

/** Asks Jev to classify each interviewed task; returns null when Jev is off or fails. */
export async function judgeTasks(interviews: Interview[]): Promise<Interview[] | null> {
  const tasks = interviews.flatMap((iv) =>
    iv.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      role: iv.role,
      pain: t.pain,
      tools: t.tools,
      keepHuman: taskStages.find((s) => s.name === t.stage)?.re.test(iv.keepHuman) ? iv.keepHuman : "",
      mode: t.mode,
    })),
  );
  if (!tasks.length) return null;
  const res = await fetch("/api/decide/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks }) }).catch(() => null);
  if (!res?.ok) return null;
  const report = (await res.json()) as JudgmentReport;
  return interviews.map((iv) => ({ ...iv, tasks: iv.tasks.map((t) => ({ ...t, judgment: report.items[t.id] ?? null })) }));
}

export async function runTask<K extends TaskKey>(task: K, payload: unknown): Promise<TaskResponse<K>> {
  const res = await fetch(`/api/ai/${task}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ error: "The server returned an unreadable response." }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data as TaskResponse<K>;
}
