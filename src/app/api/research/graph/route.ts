import { z } from "zod";
import { buildResearchRun } from "@/lib/engine/research-graph";
import type { Interview, Workspace } from "@/lib/types";

const task = z.object({
  id: z.string(),
  name: z.string(),
  hoursPerWeek: z.number().finite().min(0).max(168),
  tools: z.array(z.string()),
  process: z.string(),
  pain: z.string(),
});

const interview = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  team: z.string(),
  status: z.enum(["invited", "in-progress", "completed"]),
  invitedAt: z.string(),
  completedAt: z.string().nullable(),
  transcript: z.array(z.object({ from: z.enum(["ai", "person"]), text: z.string() })),
  context: z.string(),
  tasks: z.array(task),
  waits: z.string(),
  aiToday: z.string(),
  keepHuman: z.string(),
  satisfaction: z.number().nullable(),
  consent: z.object({ status: z.enum(["pending", "accepted", "declined"]), acceptedAt: z.string().optional() }).optional(),
});

const workspace = z.object({
  company: z.string().min(1).max(200),
  industry: z.string().max(200),
  employees: z.string().max(100),
  synthetic: z.boolean(),
  teamRoster: z.array(z.object({ team: z.string(), employees: z.number().int().positive() })).optional(),
});

const payload = z.object({ workspace, interviews: z.array(interview).max(10_000), hourlyCost: z.number().finite().positive().max(10_000).optional() });

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid research graph payload." }, { status: 400 });
  const run = buildResearchRun(parsed.data.workspace as Workspace, parsed.data.interviews as Interview[], parsed.data.hourlyCost);
  return Response.json(run);
}
