import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Meeting } from "./types";

const SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const SESSION = "fieldwork_calendar";
const STATE = "fieldwork_google_state";
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
type Connection = { accessToken: string; refreshToken?: string; tokenExpires: number; expires: number; interviewId: string };
type Pending = { verifier: string; interviewId: string; expires: number };
// Local demo only: credentials stay on the server and expire. A restart disconnects the calendar.
const host = globalThis as typeof globalThis & { fieldworkGoogle?: { connections: Map<string, Connection>; pending: Map<string, Pending> } };
const state = host.fieldworkGoogle ??= { connections: new Map(), pending: new Map() };
export const redirectUri = () => process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback";
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: redirectUri().startsWith("https:"), path: "/" });
function prune() {
  for (const [id, value] of state.connections) if (value.expires < Date.now()) state.connections.delete(id);
  for (const [id, value] of state.pending) if (value.expires < Date.now()) state.pending.delete(id);
}
export async function connection(interviewId: string) {
  prune();
  const id = (await cookies()).get(SESSION)?.value;
  const value = id ? state.connections.get(id) : undefined;
  return value?.interviewId === interviewId ? value : null;
}
export async function beginConnection(interviewId: string, origin: string) {
  prune();
  if (!googleConfigured()) throw new Error("Google Calendar needs setup first. See docs/PERSONAL-WORKSPACE.md.");
  if (new URL(redirectUri()).origin !== origin) throw new Error(`Open Fieldwork at ${new URL(redirectUri()).origin} to connect Google Calendar.`);
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  state.pending.set(nonce, { verifier, interviewId, expires: Date.now() + 600_000 });
  (await cookies()).set(STATE, nonce, { ...cookieOptions(), maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: "code", scope: SCOPE, state: nonce, access_type: "offline", prompt: "consent", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  return url.toString();
}
export async function finishConnection(url: URL) {
  const jar = await cookies();
  const nonce = url.searchParams.get("state");
  const pending = nonce ? state.pending.get(nonce) : undefined;
  const cookieState = jar.get(STATE)?.value;
  jar.delete(STATE);
  if (nonce) state.pending.delete(nonce);
  if (!pending || !nonce || nonce !== cookieState || pending.expires < Date.now()) throw new Error("expired");
  if (url.searchParams.has("error") || !url.searchParams.get("code")) throw new Error("denied");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({ code: url.searchParams.get("code")!, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(), grant_type: "authorization_code", code_verifier: pending.verifier }),
  });
  if (!response.ok) throw new Error("exchange-failed");
  const token = await response.json();
  if (!token.access_token || (token.scope && !token.scope.split(" ").includes(SCOPE))) throw new Error("permission-missing");
  const old = jar.get(SESSION)?.value;
  if (old) state.connections.delete(old);
  const id = randomBytes(32).toString("base64url");
  state.connections.set(id, { accessToken: token.access_token, refreshToken: token.refresh_token, tokenExpires: Date.now() + (token.expires_in || 3600) * 1000, expires: Date.now() + EIGHT_HOURS, interviewId: pending.interviewId });
  jar.set(SESSION, id, { ...cookieOptions(), maxAge: EIGHT_HOURS / 1000 });
  return pending.interviewId;
}
export async function disconnect() {
  const jar = await cookies();
  const id = jar.get(SESSION)?.value;
  if (id) state.connections.delete(id);
  jar.delete(SESSION);
}
export async function calendarEvents(interviewId: string): Promise<Meeting[]> {
  const auth = await connection(interviewId);
  if (!auth) throw new Error("Connect Google Calendar for this employee first.");
  if (auth.tokenExpires < Date.now() + 60_000) {
    if (!auth.refreshToken) throw new Error("Your calendar session expired. Reconnect Google Calendar.");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(15_000),
      body: new URLSearchParams({ refresh_token: auth.refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: "refresh_token" }),
    });
    if (!response.ok) throw new Error("Google authorization expired. Reconnect your calendar.");
    const token = await response.json();
    if (!token.access_token) throw new Error("Reconnect your calendar.");
    auth.accessToken = token.access_token;
    auth.tokenExpires = Date.now() + (token.expires_in || 3600) * 1000;
  }
  const query = new URLSearchParams({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 14 * 86_400_000).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "50" });
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, { headers: { Authorization: `Bearer ${auth.accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Google could not load events. Check Calendar API access or reconnect.");
  const result = await response.json();
  type Event = { id: string; status?: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string }; attendees?: { displayName?: string; email?: string; responseStatus?: string }[] };
  return (result.items ?? []).filter((event: Event) => event.status !== "cancelled").map((event: Event) => ({ id: event.id, title: (event.summary || "Untitled meeting").slice(0, 500), start: event.start?.dateTime || event.start?.date || "", attendees: (event.attendees ?? []).filter((a) => a.responseStatus !== "declined").slice(0, 100).map((a) => (a.displayName || a.email || "Attendee").slice(0, 300)), description: (event.description || "").replace(/<[^>]*>/g, "").slice(0, 10_000), source: "google" as const }));
}
