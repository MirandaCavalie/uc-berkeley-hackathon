import { z } from "zod";
import { protectLegacyApi } from "@/lib/discovery/auth";
import { decideOpportunities } from "@/lib/ai/decisions";
import { jevEnabled } from "@/lib/ai/jev";

const score = z.number().int().min(1).max(5);
const text = (max: number) => z.string().max(max);

const payload = z.object({
  opportunities: z
    .array(
      z.object({
        id: text(100),
        process: text(100),
        description: text(400),
        tasks: z
          .array(
            z.object({
              task: text(300),
              role: text(200),
              hoursPerWeek: z.number().min(0).max(80),
              tools: z.array(text(60)).max(20),
              whatSlowsItDown: text(2_000),
            }),
          )
          .max(12),
        waitingOnIt: z.number().int().min(0),
        keepHuman: z.array(text(1_000)).max(5),
        aiUsedToday: z.array(text(1_000)).max(5),
        rule: z.object({
          solution: z.enum(["automation", "skill", "agent", "human"]),
          scores: z.object({ feasibility: score, dataReadiness: score, risk: score, effort: score, adoption: score }),
        }),
      }),
    )
    .max(40),
});

export async function POST(request: Request) {
  const denied = await protectLegacyApi(request); if (denied) return denied;
  if (!jevEnabled()) return Response.json({ error: "Jev is not configured." }, { status: 503 });
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid opportunities payload." }, { status: 400 });
  try {
    return Response.json(await decideOpportunities(parsed.data.opportunities));
  } catch (error) {
    console.error("[jev:opportunities]", error);
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 140) : "Jev failed." }, { status: 502 });
  }
}
