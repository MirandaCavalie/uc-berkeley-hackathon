import { connection } from "next/server";
import { resolveModel } from "@/lib/ai/provider";

export async function GET() {
  await connection();
  const resolved = resolveModel();
  return Response.json({
    llm: Boolean(resolved),
    label: resolved?.label ?? "Local engine",
  });
}
