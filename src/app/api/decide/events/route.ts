import { z } from "zod";
import { classifyEvents } from "@/lib/ai/decisions";
import { jevEnabled } from "@/lib/ai/jev";

const payload = z.object({
  events: z
    .array(
      z.object({
        id: z.string(),
        actor: z.string().max(200),
        role: z.string().max(200),
        action: z.enum(["brief", "stage", "comment", "change-request", "request", "result"]),
        source: z.string().max(200),
        detail: z.string().max(2_000),
        stage: z.string().max(200),
      }),
    )
    .max(200),
});

export async function POST(request: Request) {
  if (!jevEnabled()) return Response.json({ error: "Jev is not configured." }, { status: 503 });
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid events payload." }, { status: 400 });
  try {
    return Response.json(await classifyEvents(parsed.data.events));
  } catch (error) {
    console.error("[jev:events]", error);
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 140) : "Jev failed." }, { status: 502 });
  }
}
