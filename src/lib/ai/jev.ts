import "server-only";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MAX_QUESTIONS = 24;

type Instructions = string | Record<string, unknown>;

export type JevQuestion =
  | { type: "choice"; instructions: Instructions; criteria: Record<string, string | null> }
  | { type: "score"; instructions: Instructions; criteria: string[] }
  | { type: "noul"; instructions: Instructions; criteria?: { true?: string; false?: string } };

export type JevAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number; legend: Record<string, string> }
  | { type: "noul"; noul: number };

export interface JevRequest {
  state: unknown;
  questions: Record<string, JevQuestion>;
}

export interface JevBatch {
  answers: Record<string, JevAnswer>;
  model: string;
  inputTokens: number;
  latencyMs: number;
  questions: number;
}

export function jevEnabled(): boolean {
  return Boolean(process.env.JEV_API_KEY);
}

async function call(state: unknown, questions: Record<string, JevQuestion>, key: string) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.JEV_MODEL || "jev-latest", state, questions }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()) as { model: string; answers: Record<string, JevAnswer>; usage?: { input_tokens?: number } };
}

/** Runs every request in parallel, splitting any request over the per-call question limit. */
export async function askJev(requests: JevRequest[]): Promise<JevBatch> {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error("JEV_API_KEY is not set");

  const calls: { state: unknown; questions: Record<string, JevQuestion> }[] = [];
  for (const r of requests) {
    const entries = Object.entries(r.questions);
    for (let i = 0; i < entries.length; i += MAX_QUESTIONS) {
      calls.push({ state: r.state, questions: Object.fromEntries(entries.slice(i, i + MAX_QUESTIONS)) });
    }
  }

  const started = Date.now();
  const responses = await Promise.all(calls.map((c) => call(c.state, c.questions, key)));
  return {
    answers: Object.assign({}, ...responses.map((r) => r.answers)),
    model: responses[0]?.model ?? "jev",
    inputTokens: responses.reduce((n, r) => n + (r.usage?.input_tokens ?? 0), 0),
    latencyMs: Date.now() - started,
    questions: calls.reduce((n, c) => n + Object.keys(c.questions).length, 0),
  };
}
