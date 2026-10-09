"use client";

import type { TaskKey, TaskResult } from "./schemas";
import type { AnalysisEngine, JudgmentReport } from "./types";

export interface TaskResponse<K extends TaskKey> {
  result: TaskResult<K>;
  engine: AnalysisEngine;
  warning: string | null;
  judgments: JudgmentReport | null;
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
