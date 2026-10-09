import { connection } from "next/server";
import { jevEnabled } from "@/lib/ai/jev";
import { resolveModel } from "@/lib/ai/provider";

export async function GET() {
  await connection();
  const resolved = resolveModel();
  return Response.json({
    llm: Boolean(resolved),
    label: resolved?.label ?? "Local engine",
    jev: jevEnabled(),
  });
}
