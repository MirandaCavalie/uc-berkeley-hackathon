import { z } from "zod";
import { checkOrigin, failure, json, readBody, requireAccess } from "@/lib/discovery/auth";
import { byId, byToken, claim, config, createSession, db, DiscoveryError, issueAccess, listSessions, rateLimit, release, save, secret, setConfig } from "@/lib/discovery/database";
import { aiConfigured } from "@/lib/discovery/agent";
import { invitationLink, invitationText, mailConfigured, publicOrigin, sendInvitation } from "@/lib/discovery/mail";
import { inviteSchema, settingsSchema, type Session, type Settings } from "@/lib/discovery/schema";
import { toInterview } from "@/lib/discovery/export";

export const maxDuration = 60;
export async function GET() {
  try {
    const who = await requireAccess();
    const sessions = listSessions(who).map(s => s.status === "submitted" ? s : { ...s, messages: [], record: null, quality: null, trace: [] });
    return json({ access: who, settings: config<Settings>("settings"), sessions, aiConfigured: aiConfigured(), mailConfigured: mailConfigured(), publicUrl: publicOrigin() });
  } catch (e) { return failure(e); }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("settings"), settings: settingsSchema }),
  z.object({ action: z.literal("invite"), person: inviteSchema }),
  z.object({ action: z.literal("link"), id: z.string().uuid() }),
  z.object({ action: z.literal("send"), id: z.string().uuid(), token: z.string().length(43) }),
  z.object({ action: z.literal("revoke"), id: z.string().uuid() }),
  z.object({ action: z.literal("lead"), team: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal("revoke_lead"), team: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal("export") }),
]);
export async function POST(request: Request) {
  let held: { id: string; lease: string } | null = null;
  try {
    checkOrigin(request);
    const who = await requireAccess();
    const parsed = actionSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new DiscoveryError("Please check the required fields.");
    const input = parsed.data;
    if (input.action === "export") return json({ interviews: listSessions(who).flatMap(s => { const iv = toInterview(s); return iv ? [iv] : []; }) });
    if (who.role !== "owner") throw new DiscoveryError("Only the research owner can manage invitations and access.", 403);
    const origin = new URL(request.url).origin;
    if (input.action === "settings") {
      const current = config<Settings>("settings");
      if (current && current.company !== input.settings.company && listSessions(who).length) throw new DiscoveryError("This research database already contains interviews for another company. Use a separate database for a new company.", 409);
      setConfig("settings", input.settings); return json({ ok: true });
    }
    if (input.action === "lead") return json({ link: `${publicOrigin() || origin}/research#access=${issueAccess({ role: "lead", team: input.team }, 7)}` });
    if (input.action === "revoke_lead") { db().prepare("DELETE FROM access WHERE role='lead' AND team=?").run(input.team); return json({ ok: true }); }
    if (input.action === "invite") {
      rateLimit("create-invite", 150, 86400000);
      const { session, token } = createSession(input.person);
      const link = invitationLink(token, origin);
      return json({ session, token, link, preview: invitationText(session, link) });
    }
    let session = byId(input.id);
    if (["revoked", "declined"].includes(session.status)) throw new DiscoveryError("This interview is closed.", 409);
    const lease = claim(session); held = { id: session.id, lease };
    if (input.action === "revoke") { save({ ...session, status: "revoked" }, lease); return json({ ok: true }); }
    if (input.action === "link") {
      if (session.status === "submitted") throw new DiscoveryError("This interview was already submitted.", 409);
      const token = secret();
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
      session = save({ ...session, expiresAt, delivery: { status: "not_sent", at: null } }, lease, undefined, token);
      const link = invitationLink(token, origin);
      return json({ session: { ...session, messages: [], record: null, quality: null, trace: [] }, token, link, preview: invitationText(session, link) });
    }
    if (byToken(input.token).id !== session.id) throw new DiscoveryError("The invitation link does not match this employee.", 403);
    if (session.delivery.status !== "not_sent") throw new DiscoveryError("This invitation has already been attempted. Check delivery before explicitly creating a replacement link.", 409);
    if (!mailConfigured() || !publicOrigin()) throw new DiscoveryError("Configure SMTP and a public HTTPS address before sending invitations.", 503);
    rateLimit("send-invite", 150, 86400000);
    // Persist an attempt before the network call: a crash must never look like an unsent invitation.
    session = save({ ...session, delivery: { status: "sending", at: new Date().toISOString() } }, lease);
    const mailLease = claim(session); held = { id: session.id, lease: mailLease };
    let status: Session["delivery"]["status"] = "accepted";
    try { await sendInvitation(session, invitationLink(input.token, origin)); } catch { status = "uncertain"; }
    save({ ...session, delivery: { status, at: new Date().toISOString() } }, mailLease);
    return json({ ok: status === "accepted", message: status === "accepted" ? "Mail server accepted the invitation. Inbox delivery is not yet confirmed." : "Delivery could not be confirmed. Check the sender’s mail logs before retrying." }, status === "accepted" ? 200 : 502);
  } catch (e) { return failure(e); }
  finally { if (held) release(held.id, held.lease); }
}
