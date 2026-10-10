import { connection } from "next/server";
import { jevEnabled } from "@/lib/ai/jev";

export async function GET() {
  await connection();
  return Response.json({ jev: jevEnabled() });
}
