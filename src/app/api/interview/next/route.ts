import { z } from "zod";
import { runInterviewGraph } from "@/lib/ai/interview-graph";
import type { RunnerState } from "@/lib/engine/interview";

const steps = ["intro", "tasks", "hours", "hoursProbe", "pain", "painProbe", "waits", "aiToday", "human", "rating", "review"] as const;

const task = z.object({
  id: z.string().max(120),
  name: z.string().max(300),
  hoursPerWeek: z.number().min(0).max(168),
  tools: z.array(z.string().max(80)).max(30),
  process: z.string().max(200),
  pain: z.string().max(4_000),
  judgment: z.unknown().optional(),
});

const interview = z.object({
  id: z.string().max(120),
  name: z.string().max(200),
  role: z.string().max(200),
  team: z.string().max(200),
  status: z.enum(["invited", "in-progress", "completed"]),
  invitedAt: z.string().max(80),
  completedAt: z.string().max(80).nullable(),
  transcript: z.array(z.object({ from: z.enum(["ai", "person"]), text: z.string().max(4_000) })).max(100),
  context: z.string().max(4_000),
  tasks: z.array(task).max(5),
  waits: z.string().max(4_000),
  aiToday: z.string().max(4_000),
  keepHuman: z.string().max(4_000),
  satisfaction: z.number().min(1).max(5).nullable(),
  consent: z.object({ status: z.enum(["pending", "accepted", "declined"]), acceptedAt: z.string().max(80).optional() }).optional(),
  agent: z
    .object({
      step: z.enum(steps),
      taskIndex: z.number().int().min(0).max(4),
      graphVersion: z.string().max(80),
      lastRoute: z.enum(["follow_up", "advance"]),
      lastNodes: z.array(z.string().max(80)).max(20),
    })
    .optional(),
});

const payload = z.object({
  state: z.object({ step: z.enum(steps), taskIndex: z.number().int().min(0).max(4), interview }),
  answer: z.string().min(1).max(4_000),
  company: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid interview turn." }, { status: 400 });
  try {
    return Response.json(await runInterviewGraph(parsed.data.state as RunnerState, parsed.data.answer, parsed.data.company));
  } catch (error) {
    console.error("[interview-graph]", error);
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 180) : "The interview graph failed." }, { status: 500 });
  }
}
