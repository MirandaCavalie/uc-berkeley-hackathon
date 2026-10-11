import { z } from "zod";
import { protectLegacyApi } from "@/lib/discovery/auth";
import { classifyTasks } from "@/lib/ai/decisions";
import { jevEnabled } from "@/lib/ai/jev";

const payload = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(300),
        role: z.string().max(200),
        pain: z.string().max(2_000),
        tools: z.array(z.string().max(60)).max(20),
        process: z.string().max(100),
      }),
    )
    .max(200),
});

export async function POST(request: Request) {
  const denied = await protectLegacyApi(request); if (denied) return denied;
  if (!jevEnabled()) return Response.json({ error: "Jev is not configured." }, { status: 503 });
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid tasks payload." }, { status: 400 });
  try {
    return Response.json(await classifyTasks(parsed.data.tasks));
  } catch (error) {
    console.error("[jev:tasks]", error);
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 140) : "Jev failed." }, { status: 502 });
  }
}
