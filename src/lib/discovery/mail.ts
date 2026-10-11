import "server-only";
import nodemailer from "nodemailer";
import { DiscoveryError } from "./database";
import type { Session } from "./schema";

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
export function publicOrigin(): string | null {
  try { const u = new URL(process.env.FIELDWORK_PUBLIC_URL || ""); return u.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) && !u.username && !u.password ? u.origin : null; } catch { return null; }
}
export function invitationLink(token: string, fallbackOrigin: string) { return `${publicOrigin() || fallbackOrigin}/interview#access=${encodeURIComponent(token)}`; }
export function invitationText(session: Session, link: string) {
  return `Hi ${session.name},\n\n${session.scope.company} invites you to a workflow discovery conversation with Fieldwork, an AI interviewer.\n\n${session.scope.purpose}\n\nPlan for about 15–20 minutes. Participation is voluntary. You can pause, skip questions, or decline. Your drafts stay private; after you submit, the research owner and your team lead can read your answers and workflow record. This is about how work happens, not a performance evaluation.\n\nOpen your private interview: ${link}\n\nThis link is personal. Do not forward it. It expires on ${session.expiresAt.slice(0, 10)}. Avoid passwords, customer identifiers and sensitive personal information. Answers are processed by OpenAI and stored for up to ${session.scope.retentionDays} days from invitation.\n\nQuestions or withdrawal requests: ${session.scope.ownerContact}\n\nFieldwork`;
}
export async function sendInvitation(session: Session, link: string) {
  if (!mailConfigured()) throw new DiscoveryError("Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM on the server first.", 503);
  if (!publicOrigin()) throw new DiscoveryError("Set FIELDWORK_PUBLIC_URL to the HTTPS address employees can reach before emailing links.", 409);
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({ from: process.env.SMTP_FROM, to: session.email, replyTo: session.scope.ownerContact,
      subject: `${session.scope.company}: your workflow interview`, text: invitationText(session, link),
      messageId: `<fieldwork-${session.id}@${new URL(publicOrigin()!).hostname}>`,
    });
    if (!result.accepted.length) throw new Error("Recipient rejected");
  } finally { transport.close(); }
}
