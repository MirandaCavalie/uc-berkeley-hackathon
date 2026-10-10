import { z } from "zod";
import { chooseInterviewMove, type InterviewStep } from "@/lib/ai/interview-agent";

const steps = ["intro", "tasks", "hours", "hoursProbe", "pain", "painProbe", "waits", "aiToday", "human", "rating", "review"] as const;

const payload = z.object({
  step: z.enum(steps),
  taskName: z.string().max(300).nullable(),
  currentTaskPain: z.string().max(2_000),
  answer: z.string().min(1).max(4_000),
  deterministicNextStep: z.enum(steps),
  deterministicNextTask: z.string().max(300).nullable(),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid interview turn." }, { status: 400 });
  const decision = await chooseInterviewMove(parsed.data as { step: InterviewStep; taskName: string | null; currentTaskPain: string; answer: string; deterministicNextStep: InterviewStep; deterministicNextTask: string | null });
  return Response.json(decision);
}
