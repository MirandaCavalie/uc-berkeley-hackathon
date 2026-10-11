import { randomUUID } from "node:crypto";
import { z } from "zod";
import { checkOrigin, failure, json, readBody } from "@/lib/discovery/auth";
import { byToken, claim, DiscoveryError, hash, rateLimit, release, replayRequest, save } from "@/lib/discovery/database";
import { aiConfigured, runTurn } from "@/lib/discovery/agent";
import { emptyRecord, type ParticipantView, type Session } from "@/lib/discovery/schema";

export const maxDuration = 120;
function sessionFor(request: Request) { return byToken(request.headers.get("authorization")?.replace(/^Bearer /, "") || ""); }
function view(session: Session): ParticipantView {
  const { email: _email, delivery: _delivery, ...visible } = session;
  void _email; void _delivery;
  return { ...visible, settings: session.scope, aiConfigured: aiConfigured() };
}
export async function GET(request: Request) {
  try { return json(view(sessionFor(request))); } catch (e) { return failure(e); }
}
const inputSchema = z.object({ action: z.enum(["consent", "answer", "review", "submit", "decline"]), version: z.number().int().min(0), requestId: z.string().uuid(), answer: z.string().trim().min(1).max(6000).optional(), reviewed: z.boolean().optional() });
export async function POST(request: Request) {
  let held: { id: string; lease: string } | null = null;
  try {
    checkOrigin(request);
    let session = sessionFor(request);
    const parsed = inputSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new DiscoveryError("Check your answer and retry.");
    const input = parsed.data;
    const fingerprint = hash(JSON.stringify(input));
    if (replayRequest(session, input.requestId, fingerprint)) return json(view(session));
    if (input.version !== session.version) throw new DiscoveryError("This interview changed in another tab. Refresh before sending again.", 409);
    if (["submitted", "declined"].includes(session.status)) throw new DiscoveryError("This interview is already closed.", 409);
    rateLimit(`session:${session.id}`, 50, 3600000);
    const lease = claim(session); held = { id: session.id, lease };
    if (input.action === "decline") {
      session = { ...session, status: "declined", messages: [], record: emptyRecord(), quality: { missing: [], flags: [], coverage: 0, ready: false }, trace: [] };
    } else if (input.action === "consent") {
      if (session.status !== "invited") throw new DiscoveryError("Participation scope was already accepted.", 409);
      session = { ...session, consentAt: new Date().toISOString(), status: "active", messages: [{ id: randomUUID(), role: "assistant", text: `Hi ${session.name.split(" ")[0]}. Tell me a little about your role and one repetitive task that takes more time than it should. We’ll walk through a recent example together.`, createdAt: new Date().toISOString() }] };
    } else {
      if (!session.consentAt) throw new DiscoveryError("Accept the participation scope before continuing.", 403);
      if (input.action === "answer") {
        if (!input.answer) throw new DiscoveryError("Enter an answer first.");
        if (session.messages.filter(m => m.role === "user").length >= 40) throw new DiscoveryError("The interview has reached its turn limit. Submit your record or contact the research owner.", 409);
        session = await runTurn(session, input.answer);
      } else if (input.action === "review") {
        session = { ...session, status: "review" };
      } else {
        if (session.status !== "review" || !input.reviewed) throw new DiscoveryError("Review the record and confirm it before submitting.", 409);
        if (!session.messages.some(m => m.role === "user")) throw new DiscoveryError("Answer at least one interview question before submitting.");
        session = { ...session, status: "submitted", submittedAt: new Date().toISOString() };
      }
    }
    return json(view(save(session, lease, { id: input.requestId, fingerprint })));
  } catch (e) { return failure(e); }
  finally { if (held) release(held.id, held.lease); }
}
