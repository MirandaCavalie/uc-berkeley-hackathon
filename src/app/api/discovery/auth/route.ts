import { z } from "zod";
import { access, checkOrigin, failure, json, localSetupAllowed, ownerConfigured, readBody, setupOwner, signIn, signOut, verifyOwner } from "@/lib/discovery/auth";
import { DiscoveryError, rateLimit, resolveAccess } from "@/lib/discovery/database";

export async function GET(request: Request) {
  try { return json({ access: await access(), configured: ownerConfigured(), canSetup: localSetupAllowed(request) && !ownerConfigured() }); } catch (e) { return failure(e); }
}
const schema = z.object({ action: z.enum(["setup", "login", "lead", "logout"]), password: z.string().max(200).optional(), token: z.string().max(100).optional() });
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = schema.parse(await readBody(request, 2000));
    if (input.action === "logout") { await signOut(); return json({ ok: true }); }
    rateLimit("research-login", 30, 15 * 60000);
    if (input.action === "lead") {
      const who = resolveAccess(input.token || "");
      if (!who || who.role !== "lead") throw new DiscoveryError("This team access link is invalid or expired.", 401);
      await signIn(who, request); return json({ access: who });
    }
    if (input.action === "setup") setupOwner(input.password || "", request);
    if (!verifyOwner(input.password || "")) throw new DiscoveryError("Incorrect owner password.", 401);
    const who = { role: "owner" as const, team: null };
    await signIn(who, request); return json({ access: who });
  } catch (e) { return failure(e); }
}
